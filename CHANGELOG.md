# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-22

### Added - 新增功能

#### 核心检测功能
- 页面链接检查（免费）
- 网站信息提取（免费）
- 域名信息查询（免费）
- SSL 证书检测（免费）
- 技术栈识别（免费）
- 性能检测（需要积分）
- SEO 合规性检测（需要积分）
- 安全检测（需要积分）
- 无障碍检测（需要积分）
- AI 分析报告（需要积分）
- 全站链接检查（需要积分，10积分/次）

#### 用户系统
- 用户注册与认证（邮箱注册/登录）
- 邮箱验证机制
- 密码重置功能
- JWT Token 认证
- 自动 Token 刷新

#### 积分系统
- 注册用户每月 10 次免费高级功能使用
- 积分购买（支持 Stripe 和 PayPal）
- 积分使用记录和统计
- 积分余额实时显示

#### 订阅系统
- 三种订阅套餐：Basic、Pro、Enterprise
- 月度积分额度
- 订阅状态管理
- 自动续费和取消订阅

#### 支付系统
- Stripe 支付集成
- PayPal 支付集成
- 安全支付流程
- 订单管理

#### 任务管理
- 任务历史记录（保留 6 个月）
- 任务详情查看
- 任务删除功能
- 任务状态实时追踪

#### Dashboard
- 使用统计概览
- 积分余额和使用情况
- 订阅状态
- 最近任务列表

#### 管理员功能
- 用户管理（查看、编辑、删除、角色管理）
- 任务管理（查看、删除、统计）
- 订阅管理（查看、更新、统计）
- 积分管理（记录查看、统计、调整）
- 收入对账（订单列表、统计、导出）
- 黑名单管理（网站和用户黑名单）
- API 访问管理（统计、记录、Token 管理）

#### 其他功能
- 实时流式检测（SSE）
- 多格式报告导出（JSON、Markdown、Excel、Word、PDF）
- 现代化 UI 设计（科技风格暗色主题）
- 多语言支持（中文/英文）
- API 访问（RESTful API、Token 认证）

### Technical - 技术实现

#### 后端
- GoFiber v2.52.0 Web 框架
- PostgreSQL 数据库
- JWT 认证系统
- bcrypt 密码加密
- 邮件服务集成
- Swagger API 文档
- 数据库迁移系统
- 插件化架构

#### 前端
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Context API
- Server-Sent Events (SSE)
- 国际化支持

### Security - 安全特性

- SSRF 防护
- IP 限流
- 并发控制
- URL 验证
- 密码哈希加密
- JWT Token 安全
- HTTP 安全头配置
- 输入验证和清理

### Documentation - 文档

- 完整的 README 文档（根目录、后端、前端）
- API 使用文档
- 产品文档
- 故障排除指南
- 数据库初始化脚本和文档

### Infrastructure - 基础设施

- 数据库迁移系统（25 个迁移文件）
- 数据库初始化脚本
- 环境变量配置
- Docker 支持（可选）
- CI/CD 就绪

---

## 版本说明

- **v1.0.0** - 初始发布版本
  - 完整的网站检测平台
  - 用户认证和授权系统
  - 积分和订阅系统
  - 支付集成
  - 管理员功能
  - API 访问管理

---

[1.0.0]: https://github.com/your-username/webcheckly/releases/tag/v1.0
