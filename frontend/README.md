# WebCheckly Frontend

WebCheckly 前端应用 - 一个现代化的网站可用性与安全检测工具，基于 Next.js 14 构建。

## 🌟 功能特性

### 核心检测功能

#### 基础功能（免费）
- **页面链接检查**（默认）
  - 实时检测页面内所有链接的可用性
  - 显示 HTTP 状态码、响应时间、IP 地址、TLS 信息
  - 支持筛选异常链接和慢响应链接

- **网站信息提取**
  - 提取网站标题、描述、关键词
  - 获取语言、字符集、作者、生成器等元数据
  - 分析 robots、viewport 等 SEO 相关信息

- **域名信息查询**
  - DNS 记录查询（IPv4、IPv6、MX、NS、TXT）
  - IP 地址解析
  - 域名相关信息展示

- **SSL 证书检测**
  - 证书颁发者和主题信息
  - 证书有效期和剩余天数
  - 签名算法、公钥算法、密钥长度
  - DNS 名称列表

- **技术栈识别**
  - Web 服务器识别（Nginx、Apache 等）
  - 前端框架检测（React、Vue、Angular 等）
  - CMS 系统识别（WordPress、Drupal 等）
  - JavaScript 库检测
  - CDN、分析工具、缓存技术识别
  - 安全响应头分析

#### 高级功能（需要积分或订阅）
- **性能检测**
  - 页面加载时间分析
  - 资源加载性能
  - 性能评分和建议

- **SEO 合规性检测**
  - SEO 元数据完整性检查
  - 结构化数据验证
  - SEO 最佳实践建议

- **安全检测**
  - 安全响应头检查
  - 常见安全漏洞扫描
  - 安全配置建议

- **无障碍检测**
  - WCAG 合规性检查
  - 无障碍功能评估
  - 改进建议

- **AI 分析报告**
  - 基于 DeepSeek AI 的智能分析
  - 综合检测结果解读
  - 优化建议和最佳实践

- **全站链接检查**
  - 深度链接发现（使用 Katana 工具）
  - 发现隐藏的 API 端点和目录结构
  - 结果自动转换为统一格式展示

### 用户账户系统

- **用户注册与认证**
  - 邮箱注册/登录页面
  - 邮箱验证功能
  - 密码重置功能
  - JWT Token 自动管理
  - Token 自动刷新机制

- **积分系统**
  - 积分余额显示
  - 积分购买页面（支持 Stripe 和 PayPal）
  - 积分使用记录查看
  - 积分使用统计

- **订阅系统**
  - 订阅套餐选择页面
  - 订阅状态显示
  - 月度使用统计
  - 订阅管理功能

- **任务管理**
  - 任务历史记录页面
  - 任务详情查看
  - 任务删除功能
  - 任务状态实时追踪

- **Dashboard**
  - 使用统计概览
  - 积分余额和使用情况
  - 订阅状态
  - 最近任务列表

### 管理员功能

- **用户管理** (`/admin/users`)
  - 用户列表查看和搜索
  - 用户角色管理
  - 用户状态管理
  - 用户信息编辑

- **任务管理** (`/admin/tasks`)
  - 所有任务查看
  - 任务统计和分析
  - 任务删除

- **订阅管理** (`/admin/subscriptions`)
  - 订阅列表查看
  - 订阅状态更新
  - 订阅统计

- **积分管理** (`/admin/credits`)
  - 积分使用记录查看和筛选
  - 积分统计和分析
  - 用户积分调整

- **收入对账** (`/admin/revenue`)
  - 订单列表和筛选
  - 收入统计（按日期、支付方式、订单类型）
  - 订单导出功能

- **黑名单管理** (`/admin/blacklist`)
  - 网站黑名单管理（禁止检测特定域名/URL）
  - 用户黑名单管理（禁止特定用户使用服务）
  - 一键添加/移除黑名单

- **API 访问管理** (`/api`)
  - API 访问统计
  - API 访问记录查看
  - API Token 管理

### 用户体验特性

- **实时流式检测**
  - 采用 Server-Sent Events (SSE) 技术
  - 检测结果即时展示，无需等待
  - 实时进度条显示
  - 扫描状态实时反馈

- **多格式报告导出**
  - **JSON 格式**：完整数据结构，适合程序处理
  - **Markdown 格式**：易读文档格式
  - **Excel 格式**：多 Sheet 表格数据，包含完整的检测信息和页面链接检查结果
  - **Word 格式**：专业文档格式
  - **PDF 格式**：便携式文档格式

- **现代化 UI 设计**
  - 科技风格界面设计
  - 响应式布局，支持移动端
  - 流畅的动画效果
  - 暗色主题，护眼设计
  - 多语言支持（中文/英文）

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 配置环境变量

创建 `frontend/.env.local` 文件（该文件不会被提交到 Git）：

```env
# 后端 API 地址
# 开发环境
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
# 生产环境示例
# NEXT_PUBLIC_API_BASE_URL=https://api.webcheckly.com
```

生产环境请设置为实际的后端 API 地址（如 `https://api.webcheckly.com`）。

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

前端将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
npm start
# 或
yarn build
yarn start
# 或
pnpm build
pnpm start
```

## 📁 项目结构

```
frontend/
├── app/                      # Next.js App Router 页面
│   ├── page.tsx             # 首页
│   ├── scan/                # 扫描页面
│   │   └── page.tsx
│   ├── login/               # 登录页面
│   │   └── page.tsx
│   ├── register/            # 注册页面
│   │   └── page.tsx
│   ├── verify-email/        # 邮箱验证页面
│   │   └── page.tsx
│   ├── forgot-password/     # 忘记密码页面
│   │   └── page.tsx
│   ├── reset-password/      # 重置密码页面
│   │   └── page.tsx
│   ├── dashboard/           # Dashboard页面
│   │   └── page.tsx
│   ├── tasks/               # 任务管理页面
│   │   └── page.tsx
│   ├── pricing/             # 定价页面
│   │   └── page.tsx
│   ├── api/                 # API访问管理页面
│   │   └── page.tsx
│   ├── admin/               # 管理员页面
│   │   ├── layout.tsx       # 管理员布局
│   │   ├── page.tsx         # 管理员Dashboard
│   │   ├── users/           # 用户管理
│   │   │   └── page.tsx
│   │   ├── tasks/           # 任务管理
│   │   │   └── page.tsx
│   │   ├── subscriptions/   # 订阅管理
│   │   │   └── page.tsx
│   │   ├── credits/         # 积分管理
│   │   │   └── page.tsx
│   │   ├── revenue/         # 收入对账
│   │   │   └── page.tsx
│   │   └── blacklist/       # 黑名单管理
│   │       └── page.tsx
│   ├── features/            # 功能特性页面
│   ├── faq/                 # 常见问题页面
│   ├── about/               # 关于我们页面
│   ├── privacy/             # 隐私政策页面
│   ├── support/             # 技术支持页面
│   ├── layout.tsx           # 根布局
│   └── globals.css          # 全局样式
├── components/              # React 组件
│   ├── Header.tsx           # 头部导航
│   ├── Footer.tsx           # 页脚
│   ├── UrlInput.tsx         # URL 输入组件
│   ├── ResultTable.tsx      # 结果表格
│   ├── ProgressBar.tsx      # 进度条
│   ├── ReportSummary.tsx    # 报告摘要
│   ├── ReportActions.tsx   # 报告导出操作
│   ├── StatusBadge.tsx     # 状态徽章
│   ├── InfoCard.tsx        # 信息卡片
│   ├── ScanOptionToggle.tsx # 扫描选项切换
│   ├── AIAnalysisReport.tsx # AI分析报告
│   ├── PerformanceCard.tsx # 性能检测卡片
│   ├── SEOComplianceCard.tsx # SEO合规性卡片
│   ├── SecurityPanel.tsx   # 安全检测面板
│   ├── AccessibilityCard.tsx # 无障碍检测卡片
│   ├── FeaturePricingBadge.tsx # 功能定价徽章
│   ├── LanguageSwitcher.tsx # 语言切换器
│   ├── ModuleStatus.tsx    # 模块状态
│   ├── SkeletonLoader.tsx  # 骨架屏加载器
│   ├── VirtualizedList.tsx # 虚拟化列表
│   ├── admin/              # 管理员组件
│   │   ├── AdminSidebar.tsx # 管理员侧边栏
│   │   ├── StatCard.tsx    # 统计卡片
│   │   └── IdDisplay.tsx  # ID显示组件
│   └── api/                # API组件
│       ├── ApiTokenCard.tsx # API Token卡片
│       ├── ApiStatsCard.tsx # API统计卡片
│       ├── ApiRecordsTable.tsx # API记录表格
│       └── ApiDocsCard.tsx # API文档卡片
├── contexts/               # React Context
│   ├── AuthContext.tsx     # 认证上下文
│   └── LanguageContext.tsx # 语言上下文
├── services/              # API服务
│   ├── authService.ts      # 认证服务
│   ├── taskService.ts      # 任务服务
│   ├── pricingService.ts   # 定价服务
│   ├── orderService.ts     # 订单服务
│   ├── paymentService.ts   # 支付服务
│   ├── subscriptionService.ts # 订阅服务
│   ├── creditsService.ts   # 积分服务
│   ├── dashboardService.ts # Dashboard服务
│   ├── adminService.ts     # 管理员服务
│   ├── blacklistService.ts # 黑名单服务
│   ├── revenueService.ts   # 收入服务
│   ├── apiAccessService.ts # API访问服务
│   └── featureAccessService.ts # 功能访问服务
├── types/                 # TypeScript 类型定义
│   └── scan.ts
├── utils/                 # 工具函数
│   ├── config.ts          # 配置文件
│   ├── report.ts          # 报告构建
│   ├── export.ts          # 导出功能
│   ├── i18n.ts            # 国际化
│   └── featureNames.ts    # 功能名称映射
├── public/                # 静态资源
├── next.config.js         # Next.js 配置
├── tailwind.config.ts     # Tailwind CSS 配置
└── tsconfig.json          # TypeScript 配置
```

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Context API
- **实时通信**: Server-Sent Events (SSE)
- **国际化**: 内置 i18n 支持（中文/英文）
- **文件导出**: 
  - Excel: `xlsx` 库
  - Word: `docx` 库
  - PDF: `jspdf` 库
  - JSON/Markdown: 原生实现

## 📖 使用说明

### 基本使用流程

1. **输入 URL**
   - 在首页输入要检测的网站 URL
   - 支持 HTTP/HTTPS 协议

2. **选择检测选项**
   - 页面链接检查（默认启用）
   - 网站信息
   - 域名信息
   - SSL 证书信息
   - 技术栈信息
   - AI 分析报告（预留功能）

3. **开始检测**
   - 点击"执行检测"按钮
   - 系统会实时显示检测进度和结果

4. **查看结果**
   - 实时查看检测结果
   - 使用筛选功能查看异常链接或慢响应链接
   - 查看详细信息卡片（网站信息、SSL 证书、域名信息、技术栈等）

5. **导出报告**
   - 检测完成后，可以导出 JSON、Markdown 或 Excel 格式的报告
   - Excel 报告包含多个 Sheet，分别展示不同类型的检测信息

### 扫描限制

- 出于安全考虑，禁止扫描内网 IP 地址（如 192.168.x.x、10.x.x.x 等）
- 单次扫描链接数量限制为 200 个
- 扫描频率限制：每分钟最多 5 次

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8080` | 否 |

### Next.js 配置

主要配置项（`next.config.js`）：
- `reactStrictMode`: 启用 React 严格模式
- HTTP 安全头配置（HSTS、XSS 保护等）

## 🎨 样式定制

项目使用 Tailwind CSS，主要颜色主题定义在 `tailwind.config.ts` 中：

- `tech-bg`: 主背景色
- `tech-cyan`: 主题青色
- `tech-blue`: 主题蓝色
- `tech-purple`: 主题紫色

可以在配置文件中修改这些颜色值来定制主题。

## 🚀 性能优化

项目已进行以下性能优化：

- ✅ 使用 `React.memo` 优化组件重渲染
- ✅ 使用 `useCallback` 和 `useMemo` 优化计算
- ✅ EventSource 连接正确清理，避免内存泄漏
- ✅ 条件化日志输出（生产环境禁用）
- ✅ 代码分割和懒加载

## 🔒 安全特性

- ✅ HTTP 安全头配置（HSTS、XSS 保护、点击劫持防护等）
- ✅ 输入验证和清理
- ✅ 安全的 JSON 解析
- ✅ 生产环境日志禁用

## 📝 开发指南

### 添加新页面

1. 在 `app/` 目录下创建新的文件夹和 `page.tsx` 文件
2. 使用 `Header` 和 `Footer` 组件保持一致的布局

### 添加新组件

1. 在 `components/` 目录下创建新的组件文件
2. 使用 TypeScript 定义组件类型
3. 使用 Tailwind CSS 进行样式设计
4. 考虑使用 `React.memo` 优化性能

### 添加新的检测选项

1. 在 `types/scan.ts` 中的 `ScanOptions` 接口添加新选项
2. 在 `components/UrlInput.tsx` 中添加对应的 UI
3. 在 `app/scan/page.tsx` 中添加对应的 SSE 事件处理
4. 在后端添加对应的检测逻辑

## 🐛 故障排除

### 无法连接到后端

- 检查后端服务是否运行（默认端口 8080）
- 检查 `NEXT_PUBLIC_API_BASE_URL` 环境变量配置是否正确
- 检查浏览器控制台是否有 CORS 错误

### 扫描结果为空

- 检查目标 URL 是否可访问
- 检查目标页面是否包含链接
- 查看浏览器控制台是否有错误信息

### 导出功能不工作

- 确保浏览器支持文件下载
- 检查是否有浏览器弹窗阻止下载
- 查看浏览器控制台是否有错误信息

## 📄 许可证

本项目遵循项目根目录的许可证。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 访问技术支持页面
