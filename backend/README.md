# WebCheckly Backend

WebCheckly 后端服务是一个基于 GoFiber 的高性能网站检测 API 服务，提供实时流式扫描功能，支持多种检测模式。

## 功能特性

### 核心功能

- **链接健康检查**：自动提取页面内所有链接，实时检测每个 URL 的可用性、状态码和响应时间
- **网站信息提取**：深度分析网站元数据，提取标题、描述、关键词等 SEO 相关信息
- **域名信息查询**：获取域名的完整 DNS 记录（MX、NS、TXT）、IP 地址（IPv4/IPv6）等信息
- **SSL 证书检测**：全面分析 SSL/TLS 证书的详细信息，包括有效期、签名算法、密钥长度等
- **技术栈识别**：智能识别网站使用的技术栈、框架、CMS 和第三方服务

### 技术特点

- **实时流式响应**：采用 Server-Sent Events (SSE) 技术，检测结果实时推送
- **高性能并发**：支持多任务并发处理，内置连接池和资源管理
- **安全防护**：多重安全机制，防止 SSRF 攻击和资源滥用
- **错误恢复**：自动 panic 恢复机制，确保服务稳定性

## 技术栈

- **Web 框架**：GoFiber v2.52.0
- **数据库**：PostgreSQL
- **认证**：JWT (github.com/golang-jwt/jwt/v5)
- **密码哈希**：bcrypt (golang.org/x/crypto/bcrypt)
- **邮件发送**：gopkg.in/mail.v2
- **HTML 解析**：goquery v1.9.0
- **HTTP 检测**：httpx CLI（需单独安装）
- **API 文档**：Swagger (swaggo/swag)
- **Go 版本**：1.21+

## 项目结构

```
backend/
├── main.go              # 应用入口，中间件配置
├── go.mod               # Go 模块定义
├── go.sum               # 依赖校验文件
├── database/            # 数据库层
│   ├── db.go            # 数据库连接和迁移
│   └── user.go          # 用户数据操作
├── models/              # 数据模型
│   ├── result.go        # 结果数据结构定义
│   ├── task.go          # 任务模型
│   └── user.go          # 用户模型
├── routes/              # 路由处理
│   ├── scan.go          # 扫描接口处理
│   ├── task.go          # 任务管理接口
│   ├── auth.go          # 认证接口
│   └── oauth.go         # OAuth接口（预留）
├── services/            # 业务服务
│   ├── auth.go          # 认证服务
│   ├── email.go         # 邮件服务
│   ├── oauth.go         # OAuth服务（预留）
│   ├── crawler.go       # 页面爬取和 URL 提取
│   ├── httpx.go         # httpx 命令执行
│   ├── sse.go           # SSE 流式推送
│   ├── website.go       # 网站信息收集
│   ├── domain.go        # 域名信息收集
│   ├── ssl.go           # SSL 证书信息收集
│   └── techstack.go     # 技术栈检测
├── middleware/          # 中间件
│   └── auth.go          # 认证中间件
├── config/              # 配置
│   └── oauth.go         # OAuth配置
├── migrations/          # 数据库迁移文件
│   ├── 001_create_users_table.up.sql
│   ├── 002_create_oauth_providers_table.up.sql
│   └── 003_add_user_id_to_tasks.up.sql
└── utils/               # 工具函数
    ├── url.go           # URL 规范化
    ├── ssrf.go          # SSRF 防护
    └── jwt.go           # JWT工具
```

## 安装和运行

### 前置要求

1. **Go 1.21+**
   ```bash
   go version
   ```

2. **PostgreSQL 数据库**
   - 下载地址：https://www.postgresql.org/download/
   - 创建数据库：`CREATE DATABASE webcheckly;`
   - 确保数据库服务正在运行

3. **httpx CLI 工具**（快速扫描）
   - 下载地址：https://github.com/projectdiscovery/httpx
   - 确保 `httpx` 命令在系统 PATH 中
   ```bash
   httpx -version
   ```

4. **深度检查工具**（可选，用于网站链接深度检查功能）
   - **katana**：深度链接检查工具
     - 下载地址：https://github.com/projectdiscovery/katana
     - 安装：`go install github.com/projectdiscovery/katana/cmd/katana@latest`
     - 验证：`katana -version`

### 安装依赖

```bash
cd backend
go mod download
# 或
go mod tidy
```

> **注意**：`go.sum` 文件会自动生成，不要手动创建。

### 运行服务

#### 开发模式

```bash
go run main.go
```

#### 生产模式

```bash
# 编译
go build -o webcheckly main.go

# 运行
./webcheckly
```

服务默认在 `http://localhost:8080` 启动。

## 环境变量配置

支持以下环境变量：

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `PORT` | 服务监听端口 | `8080` | 否 |
| `ALLOWED_ORIGINS` | CORS 允许的来源（逗号分隔） | `http://localhost:3000` | 否 |
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | - | 是 |
| `JWT_SECRET` | JWT 签名密钥 | - | 是 |
| `JWT_ACCESS_EXPIRY` | Access token 过期时间 | `15m` | 否 |
| `JWT_REFRESH_EXPIRY` | Refresh token 过期时间 | `168h` | 否 |
| `SMTP_HOST` | SMTP 服务器地址 | - | 否（如需邮件功能） |
| `SMTP_PORT` | SMTP 服务器端口 | `587` | 否 |
| `SMTP_USER` | SMTP 用户名 | - | 否（如需邮件功能） |
| `SMTP_PASSWORD` | SMTP 密码 | - | 否（如需邮件功能） |
| `SMTP_FROM` | 发件人邮箱地址 | - | 否（如需邮件功能） |
| `FRONTEND_URL` | 前端URL（用于邮件链接） | `http://localhost:3000` | 否 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（用于AI分析功能） | - | 是（如需AI分析） |
| `DEEPSEEK_API_BASE_URL` | DeepSeek API 基础URL | `https://api.deepseek.com` | 否 |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | `deepseek-chat` | 否 |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth Client ID | - | 否（如需OAuth） |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth Client Secret | - | 否（如需OAuth） |
| `GOOGLE_OAUTH_REDIRECT_URL` | Google OAuth 回调URL | - | 否（如需OAuth） |

### 环境变量加载顺序

后端会在启动时自动调用 `utils.LoadEnvFromFile`，按以下顺序加载环境变量文件（后者可以覆盖前者）：

1. `backend/.env.local`
2. `backend/.env`

文件中的配置会通过 `os.Setenv` 写入进程环境，因此：

- **同名变量优先使用文件中的值**（满足“优先从文件读取”的要求）
- 如果不想覆盖系统环境变量，可以不要在 `.env` 中写同名键

### `.env` 文件示例（推荐放在 backend 目录）

在 `backend/.env.local` 或 `backend/.env` 中写入：

```env
# 服务器配置
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,https://example.com
FRONTEND_URL=http://localhost:3000

# 数据库配置
DATABASE_URL=postgres://user:password@localhost:5432/webcheckly?sslmode=disable

# JWT配置
JWT_SECRET=your-secret-key-here-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

# SMTP配置（邮件功能）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@webcheckly.com

# AI分析配置
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# OAuth配置（可选）
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:8080/api/auth/oauth/google/callback
```

### 使用系统环境变量（可选）

你也可以继续使用系统环境变量方式，`.env` 文件会在此基础上进行覆盖：

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

### AI 分析功能配置

AI 分析功能使用 DeepSeek API 生成智能分析报告。要启用此功能，需要：

1. **获取 DeepSeek API 密钥**
   - 访问 [DeepSeek 官网](https://www.deepseek.com/)
   - 注册账号并登录
   - 在控制台创建 API 密钥

2. **设置环境变量**
   ```bash
   # Windows PowerShell
   $env:DEEPSEEK_API_KEY="sk-your-api-key-here"
   
   # Linux/macOS
   export DEEPSEEK_API_KEY="sk-your-api-key-here"
   ```

3. **可选配置**
   - `DEEPSEEK_API_BASE_URL`：如果使用代理或自定义API端点
   - `DEEPSEEK_MODEL`：指定使用的模型（默认：`deepseek-chat`）

> **注意**：如果不配置 `DEEPSEEK_API_KEY`，其他检测功能仍可正常使用，但 AI 分析报告功能将无法使用，会在前端显示友好的错误提示。

## API 接口

### Swagger 文档

项目已集成 Swagger API 文档，启动服务后可通过以下地址访问：

- **Swagger UI**: `http://localhost:8080/swagger/index.html`
- **Swagger JSON**: `http://localhost:8080/swagger/doc.json`
- **Swagger YAML**: `http://localhost:8080/swagger/doc.yaml`

#### 生成 Swagger 文档

如果需要重新生成 Swagger 文档（修改了 API 注释后）：

```bash
cd backend
# 安装 swag CLI（如果尚未安装）
go install github.com/swaggo/swag/cmd/swag@latest

# 生成文档
swag init -g main.go -o docs
```

#### API 接口列表

**认证接口**：
- **POST /api/auth/register** - 用户注册
- **POST /api/auth/login** - 用户登录
- **POST /api/auth/verify-email** - 验证邮箱
- **POST /api/auth/resend-verification** - 重新发送验证邮件
- **POST /api/auth/forgot-password** - 请求密码重置
- **POST /api/auth/reset-password** - 重置密码
- **POST /api/auth/refresh** - 刷新token
- **GET /api/auth/me** - 获取当前用户信息（需要认证）
- **POST /api/auth/logout** - 用户登出
- **GET /api/auth/oauth/:provider** - 发起OAuth登录（预留）
- **GET /api/auth/oauth/:provider/callback** - OAuth回调处理（预留）

**任务接口**：
- **POST /api/scans** - 创建扫描任务（推荐使用）
- **GET /api/scans/:id** - 获取任务状态
- **GET /api/scans/:id/results** - 获取任务结果
- **GET /api/scans/:id/stream** - SSE流式获取任务状态和结果
- **GET /api/scan** - SSE扫描接口（降级方案，已废弃）

**系统接口**：
- **GET /health** - 健康检查

详细接口文档请访问 Swagger UI。

### GET /api/scan

启动网站扫描，返回 SSE 流式数据。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 目标网站 URL |
| `options` | string[] | 否 | 扫描选项，可重复指定多个 |

#### 扫描选项

| 选项值 | 说明 |
|--------|------|
| `link-health` | 链接健康检查（默认启用） |
| `website-info` | 网站信息提取 |
| `domain-info` | 域名信息查询 |
| `ssl-info` | SSL 证书检测 |
| `tech-stack` | 技术栈识别 |
| `ai-analysis` | AI 分析报告（需要配置 `DEEPSEEK_API_KEY`） |
| `katana` | 深度链接检查（网站链接深度检查工具） |

#### 请求示例

```bash
# 基础扫描（仅链接健康检查）
curl "http://localhost:8080/api/scan?url=https://example.com"

# 完整扫描（所有选项）
curl "http://localhost:8080/api/scan?url=https://example.com&options=link-health&options=website-info&options=domain-info&options=ssl-info&options=tech-stack"
```

#### 响应格式

响应为 Server-Sent Events (SSE) 流，包含以下事件类型：

##### 1. `start` - 扫描开始

```json
{
  "total": 50,
  "message": "Starting scan..."
}
```

##### 2. `result` - 单个检测结果

```json
{
  "url": "https://example.com/page",
  "status": 200,
  "title": "Example Page",
  "response_time": 312,
  "ip": "93.184.216.34",
  "tls": true,
  "cdn": false
}
```

##### 3. `progress` - 进度更新

```json
{
  "current": 25,
  "total": 50
}
```

##### 4. `website-info` - 网站信息

```json
{
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples",
  "keywords": ["example", "domain"],
  "language": "en",
  "charset": "UTF-8",
  "author": "",
  "generator": "",
  "viewport": "width=device-width, initial-scale=1",
  "robots": "index, follow"
}
```

##### 5. `domain-info` - 域名信息

```json
{
  "domain": "example.com",
  "ip": "93.184.216.34",
  "ipv4": ["93.184.216.34"],
  "ipv6": ["2606:2800:220:1:248:1893:25c8:1946"],
  "mx": ["mail.example.com"],
  "ns": ["ns1.example.com", "ns2.example.com"],
  "txt": ["v=spf1 ..."]
}
```

##### 6. `ssl-info` - SSL 证书信息

```json
{
  "issuer": "CN=DigiCert TLS RSA SHA256 2020 CA1",
  "subject": "CN=*.example.com",
  "valid_from": "2024-01-01T00:00:00Z",
  "valid_to": "2025-01-01T23:59:59Z",
  "is_valid": true,
  "days_remaining": 180,
  "signature_alg": "SHA256-RSA",
  "public_key_alg": "RSA",
  "key_size": 2048,
  "common_name": "*.example.com",
  "dns_names": ["example.com", "*.example.com"]
}
```

##### 7. `tech-stack` - 技术栈信息

```json
{
  "server": "nginx/1.20.1",
  "powered_by": "PHP/8.1.0",
  "content_type": "text/html; charset=UTF-8",
  "technologies": ["Nginx", "PHP"],
  "framework": ["Laravel"],
  "cms": ["WordPress"],
  "javascript_lib": ["jQuery", "React"],
  "cdn": ["Cloudflare"],
  "security_headers": {
    "x-frame-options": "SAMEORIGIN",
    "strict-transport-security": "max-age=31536000"
  }
}
```

##### 8. `error` - 错误信息

```json
{
  "message": "Error description"
}
```

##### 9. `done` - 扫描完成

```json
{
  "total": 50,
  "alive": 45,
  "dead": 5,
  "avg_response": 420,
  "timeout": false
}
```

### GET /health

健康检查接口，用于监控服务状态。

#### 响应示例

```json
{
  "status": "ok",
  "timestamp": 1704067200
}
```

## 用户认证功能

### 功能特性

- **邮箱注册/登录**：支持邮箱和密码注册登录
- **邮箱验证**：注册后发送验证邮件，确保邮箱有效性
- **密码重置**：支持通过邮件重置密码
- **JWT认证**：使用JWT token进行身份验证
- **任务关联**：任务与用户关联，用户只能查看自己的任务
- **OAuth预留**：预留Google OAuth等第三方登录接口

### 数据库迁移

系统启动时会自动执行数据库迁移，创建以下表：
- `users` - 用户表
- `oauth_providers` - OAuth提供商表（预留）
- `schema_migrations` - 迁移记录表

迁移文件位于 `backend/migrations/` 目录。

### 认证流程

1. **注册**：用户提供邮箱和密码，系统创建账户并发送验证邮件
2. **验证邮箱**：用户点击邮件中的验证链接完成邮箱验证
3. **登录**：用户使用邮箱和密码登录，获得access token和refresh token
4. **访问API**：在请求头中携带 `Authorization: Bearer <token>` 进行认证
5. **刷新token**：access token过期后使用refresh token刷新

### 任务权限

- **匿名任务**：未登录用户创建的任务，任何人都可以访问
- **用户任务**：登录用户创建的任务，只有任务所有者可以访问
- **公开任务**：预留功能，标记为公开的任务所有人都可以访问

## 安全特性

### 认证安全

- **密码哈希**：使用bcrypt加密存储密码（cost factor >= 10）
- **JWT安全**：使用HS256算法，设置合理的过期时间
- **Token刷新**：支持refresh token机制，减少token泄露风险
- **邮箱验证**：验证token 24小时过期，使用UUID生成唯一token
- **密码重置**：重置token 1小时过期，重置后使旧token失效

### 限流策略

- **IP 限流**：每分钟最多 5 次请求（基于真实 IP，支持代理检测）
- **任务API限流**：每分钟最多 120 次请求（支持频繁轮询）
- **并发限制**：最多同时处理 3 个扫描任务
- **URL 数量限制**：单次扫描最多 200 个 URL
- **超时控制**：
  - 整体扫描超时：60 秒
  - HTTP 请求超时：15 秒
  - httpx 超时：10 秒
  - TLS 连接超时：10 秒

### SSRF 防护

- **私有 IP 检测**：禁止扫描内网 IP 地址
- **禁止域名列表**：阻止 localhost、127.0.0.1、云元数据地址等
- **URL 验证**：
  - 只允许 HTTP/HTTPS 协议
  - URL 长度限制：2048 字符
  - 严格的格式验证

### 其他安全措施

- **错误信息隐藏**：生产环境不暴露内部错误详情
- **Panic 恢复**：自动恢复机制，防止服务崩溃
- **请求 ID 追踪**：每个请求分配唯一 ID，便于日志追踪
- **SQL注入防护**：使用参数化查询
- **XSS防护**：前端输入验证和转义，后端验证和清理

## 性能优化

### HTTP 客户端优化

- **连接池复用**：所有 HTTP 请求使用共享客户端
- **连接池配置**：
  - `MaxIdleConns`: 100
  - `MaxIdleConnsPerHost`: 10
  - `IdleConnTimeout`: 90 秒

### httpx 优化

- **并发线程数**：30
- **速率限制**：100 请求/秒
- **超时设置**：10 秒
- **最大主机错误数**：30

### 资源管理

- **Channel 缓冲**：结果 channel 缓冲 100 个结果
- **Goroutine 管理**：使用 context 控制 goroutine 生命周期
- **内存优化**：及时释放资源，避免内存泄漏

## 中间件

### Recover 中间件

自动捕获 panic，防止服务崩溃。

### RequestID 中间件

为每个请求分配唯一 ID，便于日志追踪和问题排查。

### CORS 中间件

支持跨域请求，可通过环境变量配置允许的来源。

### Limiter 中间件

IP 限流，防止资源滥用。

## 日志

所有日志使用标准 `log` 包输出，包含以下前缀：

- `[ScanHandler]` - 扫描处理日志
- `[Crawler]` - 爬虫日志
- `[Httpx]` - httpx 执行日志
- `[SSE]` - SSE 推送日志
- `[WebsiteInfo]` - 网站信息收集日志
- `[DomainInfo]` - 域名信息收集日志
- `[SSLInfo]` - SSL 信息收集日志
- `[TechStack]` - 技术栈检测日志

## 故障排除

### 常见问题

#### 1. httpx 命令未找到

**错误信息**：
```
Error starting httpx command: exec: "httpx": executable file not found in $PATH
```

**解决方法**：
1. 确保已安装 httpx
2. 检查 `httpx` 是否在系统 PATH 中
3. 使用 `httpx -version` 验证安装

#### 2. go.sum 文件错误

**解决方法**：
```bash
# 删除 go.sum 文件
rm go.sum

# 重新生成
go mod tidy
```

#### 3. 端口被占用

**错误信息**：
```
listen tcp :8080: bind: address already in use
```

**解决方法**：
1. 使用环境变量更改端口：`export PORT=9000`
2. 或关闭占用端口的进程

#### 4. CORS 错误

**解决方法**：
1. 检查 `ALLOWED_ORIGINS` 环境变量配置
2. 确保前端地址在允许列表中

#### 5. 扫描超时

**可能原因**：
- 目标网站响应慢
- URL 数量过多（超过 200 个）
- 网络连接问题

**解决方法**：
- 减少扫描选项
- 选择链接较少的页面
- 检查网络连接

#### 6. 数据库连接失败

**错误信息**：
```
Failed to initialize database: failed to ping database
```

**解决方法**：
1. 确保PostgreSQL服务正在运行
2. 检查 `DATABASE_URL` 环境变量配置是否正确
3. 验证数据库用户权限

#### 7. JWT认证失败

**错误信息**：
```
Failed to initialize JWT: JWT_SECRET environment variable is not set
```

**解决方法**：
1. 设置 `JWT_SECRET` 环境变量
2. 确保密钥足够复杂（建议至少32字符）
3. 生产环境使用强随机密钥

## 开发说明

### 代码规范

- 使用 Go 标准代码风格
- 函数和变量使用驼峰命名
- 错误处理使用 `fmt.Errorf` 包装
- 日志使用统一前缀格式

### 添加新功能

1. **添加新的检测选项**：
   - 在 `routes/scan.go` 中添加选项解析
   - 在 `services/` 中实现对应的收集函数
   - 在 `models/result.go` 中定义数据结构

2. **添加新的 API 接口**：
   - 在 `routes/` 中创建新的处理文件
   - 在 `main.go` 中注册路由

### 测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./routes
go test ./services
```

## 许可证

MIT

## 相关链接

- [前端项目](../frontend/README.md)
- [项目主文档](../README.md)
- [httpx 文档](https://github.com/projectdiscovery/httpx)
