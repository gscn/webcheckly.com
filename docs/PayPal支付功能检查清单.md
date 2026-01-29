# PayPal 支付功能完整性检查清单

基于 **cc-skill-security-review**、**api-security-best-practices**、**paypal-integration** 等 skill 对 PayPal 支付流程做的审计与对齐检查。

---

## 一、流程概览

**购买积分（一次性）**：见 `docs/支付流程对齐说明.md`。

```
前端 Pricing → 创建订单(POST /api/orders/create) → 创建结账(POST /api/payment/create-checkout, paypal)
  → 跳转 PayPal Approve URL → 用户支付 → 回调 /payment/success?order_id=我们的订单ID
  → 前端 confirm(POST /api/payment/confirm) → 后端 Capture + ProcessPayPalPayment
  → 前端 verify(GET /api/payment/verify/:orderId) → 展示成功/失败
```

取消流程：用户取消 → 跳转 `/payment/cancel`，前端仅展示提示与返回定价页。

**订阅（基础/专业/高级，按月）**：仅用 `POST /api/subscription/subscribe`，回跳 `/subscription/success` 或 `/subscription/cancel`；与购买积分流程隔离，不经过 orders/create、create-checkout、/payment/*。

---

## 二、后端检查项

| 项 | 状态 | 说明 |
|----|------|------|
| 密钥来自环境变量 | ✅ | `PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_MODE`，无硬编码 |
| CreatePayPalOrder | ✅ | CAPTURE intent、reference_id=我们订单ID、return_url/cancel_url 正确 |
| Success URL 含 order_id | ✅ | 支持 `{ORDER_ID}` 占位符或 `?order_id=` 结尾追加，见 README |
| CapturePayPalOrder | ✅ | 使用 PayPal 订单 ID 调 `/v2/checkout/orders/:id/capture`，返回 capture ID |
| ProcessPayPalPayment | ✅ | 更新订单 PayPal 信息、状态、积分等 |
| Confirm 接口 | ✅ | 校验订单归属、已支付则幂等返回、仅 PayPal 订单可 confirm |
| Verify 接口 | ✅ | 按我们订单 ID 查订单状态，校验归属 |
| Webhook 签名校验 | ⚠️ | 校验 headers 存在；未配置 `PAYPAL_WEBHOOK_ID` 时跳过验证（不推荐生产） |
| Webhook 幂等 | ✅ | `ProcessPayPalWebhookEvent` 仅做幂等检查，业务在 handler 中处理 |
| create-checkout 校验 | ✅ | `order_id` 必填、订单存在、归属校验、金额存在 |
| 敏感信息不写日志 | ✅ | 仅记录 PayPal 订单 ID、我们订单 ID 等业务 ID，不记录 token/secret |

---

## 三、前端检查项

| 项 | 状态 | 说明 |
|----|------|------|
| 创建订单 | ✅ | `createOrder('credits_purchase', undefined, amount, 'paypal')`，用 `order.id` 做 create-checkout |
| 创建结账 & 跳转 | ✅ | `createCheckoutSession(order.id, 'paypal')`，`redirectToPayment(result.url)` 跳 approve URL |
| Success 页 | ✅ | 读 `order_id`（PayPal 回跳）或 `session_id`（Stripe），先 confirm 再 verify，展示结果 |
| Cancel 页 | ✅ | 提示已取消，链接回定价页 |
| paymentService | ✅ | `confirmPayment`、`verifyPayment`、`verifyPaymentBySessionId` 调对应后端接口 |
| API 基地址 | ✅ | `NEXT_PUBLIC_API_URL`，未设置则 `http://localhost:8080` |

---

## 四、前后端接口对齐

| 接口 | 前端 | 后端 | 对齐 |
|------|------|------|------|
| POST /api/orders/create | `order_type`, `amount`, `payment_method` | 同左，返回 `Order` | ✅ |
| POST /api/payment/create-checkout | `order_id`（我们）, `payment_method` | 同左，PayPal 返回 `url`, `order_id`(PayPal), `provider` | ✅ 前端仅用 `url` |
| POST /api/payment/confirm | `order_id`（我们） | 同左，返回 `order_id`, `status`, `paid_at` | ✅ |
| GET /api/payment/verify/:orderId | - | 路径 `orderId`，返回 `order_id`, `status`, `paid_at` | ✅ |
| GET /api/payment/verify-session?session_id= | Stripe 用 | 同左 | ✅ PayPal 不用 |

Success 页：PayPal 回跳带 `order_id`（我们），前端用其调 confirm + verify；Stripe 回跳带 `session_id`，前端用 verify-session。

---

## 五、环境变量与配置

- **PayPal**：`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`、`PAYPAL_MODE`（可选，默认 sandbox）。
- **Success/Cancel URL**：  
  - 一次性支付：`PAYPAL_PAYMENT_SUCCESS_URL`、`PAYPAL_PAYMENT_CANCEL_URL`。  
  - Success 须包含我们订单 ID：`{ORDER_ID}` 或 `?order_id=` 结尾，见 README。
- **Webhook**：`PAYPAL_WEBHOOK_ID` 配置后启用校验；生产建议配置并校验签名。

---

## 六、已修复项（本次审计）

1. **Success URL 未带 order_id**：配置了 `PAYPAL_PAYMENT_SUCCESS_URL` 时，原先未追加我们订单 ID；已改为支持 `{ORDER_ID}` 或 `?order_id=` 结尾追加。
2. **Webhook 误报已处理**：`ProcessPayPalWebhookEvent` 曾对所有事件返回“已处理”，导致路由逻辑从未执行；已改为仅做幂等检查，业务处理留在 handler。
3. **create-checkout 校验**：增加 `order_id` 必填校验。

---

## 七、已做对齐（本次）

- **API 错误响应**：后端支付/订单类接口返回 `error`。前端 `orderService`、`pricingService` 已改为 `error.error || error.message` 解析，与后端对齐。

## 八、建议后续


- [ ] 生产环境配置 `PAYPAL_WEBHOOK_ID`，并实现完整的 PayPal Webhook 签名验证（含调用 PayPal 验证 API）。
- [ ] Webhook 幂等落库：将已处理事件 ID 写入数据库，`ProcessWebhookEvent` 查库判断。
- [ ] 确认 `PAYMENT.CAPTURE.COMPLETED` 的 `resource` 结构与解析逻辑与 PayPal 实际推送一致，必要时根据文档调整。
