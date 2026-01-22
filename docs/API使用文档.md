# WebCheckly API 使用文档

## 概述

WebCheckly API 允许您通过编程方式访问网站扫描功能。API 访问权限仅对**专业版**和**高级版**用户开放。

## 访问限制

- **专业版**：每月 1000 次 API 调用
- **高级版**：每月 10000 次 API 调用
- **基础版**：不支持 API 访问

## 认证方式

所有 API 请求都需要在请求头中包含访问令牌（Access Token）：

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 获取访问令牌

1. 登录到 WebCheckly 账户
2. 访问用户中心（Dashboard）
3. 在 API 管理页面查看您的访问令牌

## API 基础 URL

```
http://localhost:8080  # 开发环境
https://api.webcheckly.com  # 生产环境（示例）
```

## 主要 API 端点

### 1. 创建扫描任务

**POST** `/api/scans`

创建新的网站扫描任务。

**请求体：**
```json
{
  "url": "https://example.com",
  "options": ["website-info", "domain-info", "ssl-info"],
  "language": "zh",
  "ai_mode": "balanced"
}
```

**支持的扫描选项：**
- `website-info`: 网站基础信息
- `domain-info`: 域名DNS信息
- `ssl-info`: SSL证书信息
- `tech-stack`: 技术栈识别
- `link-health`: 链接健康检查
- `performance`: 性能检测
- `seo`: SEO合规性检测
- `security`: 安全风险检测
- `accessibility`: 可访问性检测
- `ai-analysis`: AI智能分析报告

**响应示例：**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### 2. 获取任务状态

**GET** `/api/scans/{task_id}`

查询任务执行状态。

**响应示例：**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "target_url": "https://example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:05:00Z",
  "progress": {
    "current": 5,
    "total": 10
  },
  "modules": {
    "website-info": {
      "name": "website-info",
      "status": "completed",
      "progress": {
        "current": 1,
        "total": 1
      }
    }
  }
}
```

### 3. 获取任务结果

**GET** `/api/scans/{task_id}/results`

获取任务的完整扫描结果。

**响应示例：**
```json
{
  "website_info": {
    "title": "Example Website",
    "description": "...",
    "keywords": "..."
  },
  "domain_info": {
    "ip": "192.0.2.1",
    "dns_records": [...]
  },
  "ssl_info": {
    "valid": true,
    "expires_at": "2024-12-31T23:59:59Z"
  },
  ...
}
```

### 4. 获取API访问统计

**GET** `/api/api-access/stats`

获取当前用户的API访问统计信息。

**响应示例：**
```json
{
  "total_requests": 150,
  "monthly_requests": 50,
  "monthly_limit": 1000,
  "remaining_requests": 950
}
```

### 5. 获取API访问记录

**GET** `/api/api-access/records?limit=20&offset=0`

获取API访问记录列表。

**响应示例：**
```json
{
  "records": [
    {
      "id": "...",
      "api_endpoint": "/api/scans",
      "method": "POST",
      "status_code": 201,
      "response_time_ms": 150,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

## 代码示例

### cURL

```bash
curl -X POST http://localhost:8080/api/scans \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": ["website-info", "domain-info"],
    "language": "zh"
  }'
```

### JavaScript

```javascript
const response = await fetch('http://localhost:8080/api/scans', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: ['website-info', 'domain-info'],
    language: 'zh'
  })
});

const data = await response.json();
console.log('Task ID:', data.id);
```

### Python

```python
import requests

headers = {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
}

data = {
    'url': 'https://example.com',
    'options': ['website-info', 'domain-info'],
    'language': 'zh'
}

response = requests.post(
    'http://localhost:8080/api/scans',
    headers=headers,
    json=data
)

task = response.json()
print('Task ID:', task['id'])
```

## 错误处理

API 使用标准的 HTTP 状态码：

- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权（缺少或无效的访问令牌）
- `403 Forbidden`: 禁止访问（API访问限制或权限不足）
- `404 Not Found`: 资源不存在
- `429 Too Many Requests`: 请求过于频繁（超过限流）
- `500 Internal Server Error`: 服务器内部错误

**错误响应格式：**
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

## 限流说明

- API 请求受到限流保护
- 每个用户每分钟最多 300 次请求
- 超过限制将返回 `429 Too Many Requests` 错误

## 更多资源

- **Swagger API 文档**：访问 `/swagger/index.html` 查看完整的 API 文档
- **API 管理页面**：登录后在用户中心访问 API 管理页面，查看使用统计和访问记录

## 支持

如有问题或建议，请通过技术支持页面联系我们。
