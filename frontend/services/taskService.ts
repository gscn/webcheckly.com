import { API_BASE_URL, debugError } from "@/utils/config"
import { TaskResults } from "@/types/scan"
import { fetchWithRetry } from "@/utils/retry"
import { authenticatedFetch, getAccessToken } from "@/services/authService"

// 任务状态
export type TaskStatus = "pending" | "running" | "completed" | "failed"

// 任务进度
export interface TaskProgress {
  current: number
  total: number
}

// 模块状态
export interface ModuleStatus {
  name: string
  status: TaskStatus
  progress: TaskProgress
  error?: string
  started_at?: string
  completed_at?: string
}

// 任务状态响应
export interface TaskStatusResponse {
  id: string
  status: TaskStatus
  created_at: string
  updated_at: string
  target_url?: string // 目标URL（可选，用于查看历史任务）
  progress: TaskProgress
  modules: Record<string, ModuleStatus>
  error?: string
}

// 创建任务请求
export interface CreateTaskRequest {
  url: string
  options: string[]
  language?: string
  ai_mode?: string
}

// 创建任务响应
export interface CreateTaskResponse {
  id: string
  status: TaskStatus
  created_at: string
}

// 导出TaskResults类型（从types/scan.ts导入）
export type { TaskResults }

/**
 * 创建扫描任务
 */
export async function createScanTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to create task" }))
    // 创建错误对象，包含状态码和响应信息
    const errorObj: any = new Error(error.error || error.message || "Failed to create task")
    errorObj.status = response.status
    errorObj.message = error.message || error.error || errorObj.message
    errorObj.response = { json: async () => error }
    throw errorObj
  }

  return response.json()
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/scans/${taskId}`)

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("You don't have permission to access this task")
    }
    if (response.status === 404) {
      throw new Error("Task not found")
    }
    const error = await response.json().catch(() => ({ error: "Failed to get task status" }))
    throw new Error(error.error || "Failed to get task status")
  }

  return response.json()
}

/**
 * 获取任务结果（带重试机制）
 */
export async function getTaskResults(taskId: string): Promise<TaskResults> {
  try {
    // 使用authenticatedFetch，但需要适配fetchWithRetry
    const token = getAccessToken()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/scans/${taskId}/results`,
      { headers },
      {
        maxRetries: 2,
        retryDelay: 1000,
        retryCondition: (error) => {
          // 202状态码表示结果尚未准备好，不应该重试
          if (error.status === 202) {
            return false
          }
          // 403权限错误不应该重试
          if (error.status === 403) {
            return false
          }
          return true
        },
      }
    )

    const jsonData = await response.json()
    return jsonData
  } catch (error: any) {
    if (error.status === 202) {
      throw new Error("结果尚未准备好，请稍候")
    }
    if (error.status === 403) {
      throw new Error("You don't have permission to access this task")
    }
    if (error.status === 404) {
      throw new Error("任务不存在或已过期")
    }
    throw new Error(error.error || error.message || "获取任务结果失败")
  }
}

/**
 * 轮询任务状态（支持动态调整轮询间隔）
 * @param taskId 任务ID
 * @param onUpdate 状态更新回调，可以返回新的轮询间隔（返回0或负数表示停止）
 * @param initialInterval 初始轮询间隔（毫秒），默认 1000ms
 * @returns 停止轮询的函数
 */
export function pollTaskStatus(
  taskId: string,
  onUpdate: (status: TaskStatusResponse) => void | number | undefined,
  initialInterval: number = 1000
): () => void {
  let isPolling = true
  let timeoutId: NodeJS.Timeout | null = null
  let currentInterval = initialInterval

  const poll = async () => {
    if (!isPolling) return

    try {
      const status = await getTaskStatus(taskId)
      const result = onUpdate(status)
      
      // 如果回调返回了新的间隔，更新它
      if (typeof result === "number") {
        if (result <= 0) {
          // 返回0或负数表示停止轮询
          isPolling = false
          return
        }
        currentInterval = result
      }

      // 如果任务已完成或失败，停止轮询
      if (status.status === "completed" || status.status === "failed") {
        isPolling = false
        return
      }

      // 继续轮询
      if (isPolling) {
        timeoutId = setTimeout(poll, currentInterval)
      }
    } catch (error) {
      debugError("[TaskService] Error polling task status:", error)
      // 发生错误时也继续轮询（可能是网络问题），但使用较长的间隔
      if (isPolling) {
        timeoutId = setTimeout(poll, Math.max(currentInterval, 3000))
      }
    }
  }

  // 立即开始第一次轮询
  poll()

  // 返回停止轮询的函数
  return () => {
    isPolling = false
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * 使用SSE流式获取任务状态和结果
 * @param taskId 任务ID
 * @param onStatus 状态更新回调
 * @param onModuleStatus 模块状态更新回调
 * @param onResult 结果更新回调（实时推送的全站链接检查结果）
 * @param onDone 完成回调
 * @param onError 错误回调
 * @returns 关闭SSE连接的函数
 */
export function streamTaskStatus(
  taskId: string,
  onStatus?: (status: TaskStatusResponse) => void,
  onModuleStatus?: (module: string, status: ModuleStatus) => void,
  onResult?: (result: any) => void,
  onDone?: (data: any) => void,
  onError?: (error: string) => void
): () => void {
  // EventSource不支持自定义headers，需要通过query参数传递token
  const token = getAccessToken()
  let streamUrl = `${API_BASE_URL}/api/scans/${taskId}/stream`
  if (token) {
    streamUrl += `?token=${encodeURIComponent(token)}`
  }
  const eventSource = new EventSource(streamUrl)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      // 根据事件类型处理
      // 注意：EventSource的onmessage只处理没有event字段的消息
      // 我们需要使用addEventListener来处理不同类型的事件
    } catch (error) {
      debugError("[TaskService] Error parsing SSE message:", error)
    }
  }

  // 处理status事件
  eventSource.addEventListener("status", (event: MessageEvent) => {
    try {
      const status = JSON.parse(event.data) as TaskStatusResponse
      onStatus?.(status)
    } catch (error) {
      debugError("[TaskService] Error parsing status event:", error)
    }
  })

  // 处理module-status事件
  eventSource.addEventListener("module-status", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as { task_id: string; module: string; status: ModuleStatus }
      onModuleStatus?.(data.module, data.status)
    } catch (error) {
      debugError("[TaskService] Error parsing module-status event:", error)
    }
  })

  // 处理result事件（实时推送的全站链接检查结果）
  eventSource.addEventListener("result", (event: MessageEvent) => {
    try {
      const result = JSON.parse(event.data)
      onResult?.(result)
    } catch (error) {
      debugError("[TaskService] Error parsing result event:", error)
    }
  })

  // 处理katana-result事件（实时推送的单个全站链接检查结果）
  eventSource.addEventListener("katana-result", (event: MessageEvent) => {
    try {
      const result = JSON.parse(event.data)
      onResult?.(result)
    } catch (error) {
      debugError("[TaskService] Error parsing katana-result event:", error)
    }
  })

  // 处理results事件（完整结果）
  eventSource.addEventListener("results", (event: MessageEvent) => {
    try {
      const results = JSON.parse(event.data) as TaskResults
      onResult?.(results)
    } catch (error) {
      debugError("[TaskService] Error parsing results event:", error)
    }
  })

  // 处理done事件
  eventSource.addEventListener("done", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      onDone?.(data)
      eventSource.close()
    } catch (error) {
      debugError("[TaskService] Error parsing done event:", error)
    }
  })

  // 处理error事件
  eventSource.addEventListener("error", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      onError?.(data.message || "Unknown error")
    } catch (error) {
      debugError("[TaskService] Error parsing error event:", error)
    }
  })

  // 处理连接错误
  eventSource.onerror = (error) => {
    // 检查连接状态
    if (eventSource.readyState === EventSource.CLOSED) {
      // 连接已关闭，可能是正常关闭（任务完成），不触发错误
      return
    }
    if (eventSource.readyState === EventSource.CONNECTING) {
      // 正在连接中，等待连接建立
      return
    }
    // 只有在OPEN状态下出错才报告错误
    if (eventSource.readyState === EventSource.OPEN) {
      debugError("[TaskService] SSE connection error (state: OPEN):", error)
      // 不立即关闭连接，让服务器发送error事件来处理
      // onError?.("SSE connection error")
    } else {
      debugError("[TaskService] SSE connection error (state: " + eventSource.readyState + "):", error)
    }
  }

  // 返回关闭函数
  return () => {
    eventSource.close()
  }
}
