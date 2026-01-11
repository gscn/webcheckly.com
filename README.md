# WebCheckly - 网站运维检测工具

输入一个网址，一分钟内生成一份**可用性 + 性能 + 页面资源存活性**的技术运维检测报告。

## 🌟 功能特性

### 核心检测功能

- **链接健康检查**（默认）
  - 自动提取页面内所有链接（最多 200 个）
  - 实时检测每个 URL 的可用性、HTTP 状态码、响应时间
  - 显示 IP 地址、TLS 信息、CDN 信息
  - 支持筛选异常链接和慢响应链接

- **网站信息提取**
  - 提取网站标题、描述、关键词等 SEO 元数据
  - 获取语言、字符集、作者、生成器等元信息
  - 分析 robots、viewport 等 SEO 相关配置

- **域名信息查询**
  - DNS 记录查询（IPv4、IPv6、MX、NS、TXT）
  - IP 地址解析和地理位置信息
  - 域名注册相关信息展示

- **SSL 证书检测**
  - 证书颁发者和主题信息
  - 证书有效期和剩余天数计算
  - 签名算法、公钥算法、密钥长度分析
  - DNS 名称列表（SAN）展示

- **技术栈识别**
  - Web 服务器识别（Nginx、Apache 等）
  - 前端框架检测（React、Vue、Angular 等）
  - CMS 系统识别（WordPress、Drupal 等）
  - JavaScript 库、CDN、分析工具检测
  - 安全响应头分析

- **深度检查**（新增）
  - **Katana**：深度链接检查，发现页面中的所有链接和资源，包括隐藏的API端点和目录结构
  - 结果自动转换为链接健康检查格式，统一展示
  - 结果自动合并，统一展示格式

### 用户体验特性

- **实时流式检测**
  - 采用 Server-Sent Events (SSE) 技术
  - 检测结果即时展示，无需等待全部完成
  - 实时进度条和状态反馈

- **多格式报告导出**
  - **JSON 格式**：完整数据结构，适合程序处理
  - **Markdown 格式**：易读文档格式，支持表格
  - **Excel 格式**：多 Sheet 表格数据，包含完整的检测信息和链接健康检查结果

- **现代化 UI 设计**
  - 科技风格暗色主题界面
  - 响应式布局，完美支持移动端
  - 流畅的动画效果和交互体验

## 🏗️ 项目结构

```
WebCheckly/
├── backend/          # GoFiber API服务（端口8080）
│   ├── main.go      # 应用入口，中间件配置
│   ├── models/      # 数据模型定义
│   │   └── result.go
│   ├── routes/      # 路由处理
│   │   └── scan.go  # 扫描接口
│   ├── services/    # 业务服务
│   │   ├── crawler.go    # 页面爬取和URL提取
│   │   ├── httpx.go      # httpx命令执行
│   │   ├── sse.go        # SSE流式推送
│   │   ├── website.go    # 网站信息收集
│   │   ├── domain.go     # 域名信息收集
│   │   ├── ssl.go        # SSL证书信息收集
│   │   ├── techstack.go  # 技术栈检测
│   │   ├── katana.go     # Katana深度链接检查
│   │   └── merger.go     # 结果合并服务
│   └── utils/       # 工具函数
│       ├── url.go   # URL规范化
│       └── ssrf.go  # SSRF防护
├── frontend/        # Next.js 14前端（端口3000）
│   ├── app/         # Next.js App Router页面
│   │   ├── page.tsx      # 首页
│   │   ├── scan/         # 快速扫描页面
│   │   ├── deep-scan/    # 深度检查页面
│   │   ├── features/     # 功能特性页面
│   │   ├── faq/          # 常见问题页面
│   │   ├── about/        # 关于我们页面
│   │   ├── privacy/      # 隐私政策页面
│   │   ├── support/      # 技术支持页面
│   │   └── layout.tsx    # 根布局
│   ├── components/  # React组件
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── UrlInput.tsx
│   │   ├── ResultTable.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── ReportSummary.tsx
│   │   ├── ReportActions.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── InfoCard.tsx
│   │   ├── ScanOptionToggle.tsx
│   │   └── deep-scan/    # 深度扫描组件
│   │       ├── ToolStatusCard.tsx
│   │       ├── KatanaResults.tsx
│   │       └── ToolStatusCard.tsx
│   ├── types/       # TypeScript类型定义
│   │   └── scan.ts
│   └── utils/       # 工具函数
│       ├── config.ts
│       ├── report.ts
│       └── export.ts
└── docs/            # 产品文档
    ├── 产品文档.md
    └── OPTIMIZATION.md
```

## 🚀 快速开始

### 前置要求

- **Go 1.21+**
  ```bash
  go version
  ```

- **Node.js 18+**
  ```bash
  node --version
  ```

- **httpx CLI 工具**（快速扫描，需已安装并在 PATH 中）
  - 下载地址：https://github.com/projectdiscovery/httpx
  - 验证安装：`httpx -version`

- **深度检查工具**（可选，用于深度检查功能）
  - **katana**：深度链接检查工具
    - 安装：`go install github.com/projectdiscovery/katana/cmd/katana@latest`
    - 验证：`katana -version`

> **Windows 用户注意**：在 Windows 上安装和调试 katana 工具需要特殊处理，请参考 [Windows 调试指南](./docs/Windows调试指南.md) 获取详细说明。

### 安装与运行

#### 1. 启动后端服务

```bash
cd backend
go mod download
go run main.go
```

后端服务将在 **http://localhost:8080** 启动

#### 2. 启动前端服务

```bash
cd frontend
npm install
# 或
yarn install
# 或
pnpm install

# 配置环境变量（可选）
# 创建 frontend/.env.local 文件
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8080" > .env.local

# 运行开发服务器
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

前端将在 **http://localhost:3000** 启动

#### 3. 访问应用

打开浏览器访问：**http://localhost:3000**

## 📖 使用说明

### 基本使用流程

1. **输入 URL**
   - 在首页输入要检测的网站 URL
   - 支持 HTTP/HTTPS 协议
   - URL 会自动标准化（自动添加协议前缀）

2. **选择检测选项**
   - ✅ 链接健康检查（默认启用）
   - ✅ 网站信息
   - ✅ 域名信息
   - ✅ SSL 证书信息
   - ✅ 技术栈信息
   - ✅ AI 分析报告（需要配置 `DEEPSEEK_API_KEY` 环境变量）

3. **开始检测**
   - 点击"执行检测"按钮
   - 系统会实时显示检测进度和结果
   - 检测过程中可以查看实时结果表格

4. **查看结果**
   - 实时查看检测结果
   - 使用筛选功能查看异常链接或慢响应链接
   - 查看详细信息卡片（网站信息、SSL 证书、域名信息、技术栈等）

5. **导出报告**
   - 检测完成后，可以导出以下格式的报告：
     - **JSON**：完整数据结构，适合程序处理
     - **Markdown**：易读文档格式
     - **Excel**：多 Sheet 表格数据，包含完整的检测信息和链接健康检查结果

### 深度扫描功能

1. **访问深度扫描页面**
   - 在导航菜单中点击"深度扫描"
   - 或直接访问 `/deep-scan`

2. **输入目标URL**
   - 输入要检测的网站URL
   - 点击"开始深度扫描"

3. **查看执行状态**
   - 实时查看 Katana 的执行状态和进度
   - 查看错误信息（如有）

4. **查看详细结果**
   - **发现的链接和资源**：完整的链接列表，包括URL、类型、状态码、标题等信息
   - **统计信息**：总计、成功、错误链接数量
   - **过滤和搜索**：支持按类型、状态筛选，以及关键词搜索

5. **结果自动合并**
   - 深度检查结果会自动转换为链接健康检查格式
   - 可在前端统一展示，同时保留原始详细数据

> **注意**：深度检查需要安装 katana 工具。如果工具未安装，检查将失败。详细安装说明请参考 [深度检查使用指南](./docs/深度检查使用指南.md)。

## 🔒 安全特性

### 限流策略

- **IP 限流**：每分钟最多 5 次请求（基于真实 IP，支持代理检测）
- **并发限制**：最多同时处理 3 个扫描任务
- **URL 数量限制**：单次扫描最多 200 个 URL
- **超时控制**：
  - 整体扫描超时：60 秒
  - HTTP 请求超时：15 秒
  - httpx 超时：10 秒
  - TLS 连接超时：10 秒

### SSRF 防护

- **私有 IP 检测**：禁止扫描内网 IP 地址（192.168.x.x、10.x.x.x 等）
- **禁止域名列表**：阻止 localhost、127.0.0.1、云元数据地址等
- **URL 验证**：
  - 只允许 HTTP/HTTPS 协议
  - URL 长度限制：2048 字符
  - 严格的格式验证

### 其他安全措施

- **错误信息隐藏**：生产环境不暴露内部错误详情
- **Panic 恢复**：自动恢复机制，防止服务崩溃
- **HTTP 安全头**：前端配置 HSTS、XSS 保护、点击劫持防护等
- **请求 ID 追踪**：每个请求分配唯一 ID，便于日志追踪

## 🛠️ 技术栈

### 后端

- **Web 框架**：GoFiber v2.52.0
- **HTML 解析**：goquery v1.9.0
- **HTTP 检测**：httpx CLI
- **Go 版本**：1.21+

### 前端

- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **实时通信**：Server-Sent Events (SSE)
- **文件导出**：
  - Excel: `xlsx` 库
  - JSON/Markdown: 原生实现

## 🔧 配置说明

### 后端环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `PORT` | 服务监听端口 | `8080` | 否 |
| `ALLOWED_ORIGINS` | CORS 允许的来源（逗号分隔） | `http://localhost:3000` | 否 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（用于AI分析功能） | - | 是（如需AI分析） |
| `DEEPSEEK_API_BASE_URL` | DeepSeek API 基础URL | `https://api.deepseek.com` | 否 |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | `deepseek-chat` | 否 |

**示例：**
```bash
# Windows PowerShell
$env:PORT="9000"
$env:ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
$env:DEEPSEEK_API_KEY="sk-your-api-key-here"
go run main.go

# Linux/macOS
export PORT=9000
export ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
export DEEPSEEK_API_KEY="sk-your-api-key-here"
go run main.go
```

**获取 DeepSeek API 密钥：**
1. 访问 [DeepSeek 官网](https://www.deepseek.com/)
2. 注册账号并登录
3. 在控制台创建 API 密钥
4. 将密钥设置为 `DEEPSEEK_API_KEY` 环境变量

> **注意**：如果不配置 `DEEPSEEK_API_KEY`，其他检测功能（链接健康检查、网站信息、域名信息、SSL证书、技术栈）仍可正常使用，但 AI 分析报告功能将无法使用。

### 前端环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8080` | 否 |

创建 `frontend/.env.local` 文件（该文件不会被提交到 Git）：
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## 📡 API 接口

### GET /api/scan

启动网站扫描，返回 SSE 流式数据。

**请求参数：**
- `url` (string, 必填)：目标网站 URL
- `options` (string[], 可选)：扫描选项，可重复指定多个

**扫描选项：**
- `link-health`：链接健康检查（默认启用）
- `website-info`：网站信息提取
- `domain-info`：域名信息查询
- `ssl-info`：SSL 证书检测
- `tech-stack`：技术栈识别
- `ai-analysis`：AI 分析报告（预留）

**请求示例：**
```bash
# 基础扫描（仅链接健康检查）
curl "http://localhost:8080/api/scan?url=https://example.com"

# 完整扫描（所有选项）
curl "http://localhost:8080/api/scan?url=https://example.com&options=link-health&options=website-info&options=domain-info&options=ssl-info&options=tech-stack"
```

**响应格式：** Server-Sent Events (SSE) 流

详细 API 文档请参考：[backend/README.md](backend/README.md#api-接口)

### GET /health

健康检查接口，用于监控服务状态。

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": 1704067200
}
```

## 🚀 性能优化

### 后端优化

- **HTTP 客户端连接池复用**：所有 HTTP 请求使用共享客户端
- **httpx 并发优化**：并发线程数 30，速率限制 100 请求/秒
- **资源管理**：使用 context 控制 goroutine 生命周期，及时释放资源

### 前端优化

- ✅ 使用 `React.memo` 优化组件重渲染
- ✅ 使用 `useCallback` 和 `useMemo` 优化计算
- ✅ EventSource 连接正确清理，避免内存泄漏
- ✅ 条件化日志输出（生产环境禁用）
- ✅ 代码分割和懒加载

## 🐛 故障排除

### 常见问题

#### 1. httpx 命令未找到

**错误信息：**
```
Error starting httpx command: exec: "httpx": executable file not found in $PATH
```

**解决方法：**
1. 确保已安装 httpx
2. 检查 `httpx` 是否在系统 PATH 中
3. 使用 `httpx -version` 验证安装

#### 2. 无法连接到后端

**解决方法：**
- 检查后端服务是否运行（默认端口 8080）
- 检查 `NEXT_PUBLIC_API_BASE_URL` 环境变量配置是否正确
- 检查浏览器控制台是否有 CORS 错误

#### 3. 端口被占用

**解决方法：**
- 使用环境变量更改端口：`export PORT=9000`
- 或关闭占用端口的进程

#### 4. 扫描超时

**可能原因：**
- 目标网站响应慢
- URL 数量过多（超过 200 个）
- 网络连接问题

**解决方法：**
- 减少扫描选项
- 选择链接较少的页面
- 检查网络连接

更多故障排除信息请参考：
- [后端故障排除](backend/README.md#故障排除)
- [前端故障排除](frontend/README.md#故障排除)

## 📚 详细文档

- [后端详细文档](backend/README.md) - API 接口、安全特性、性能优化等
- [前端详细文档](frontend/README.md) - 组件说明、开发指南、配置说明等
- [产品文档](docs/产品文档.md) - 产品设计文档

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
