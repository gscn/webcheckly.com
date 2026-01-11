package services

import (
	"fmt"
	"time"
	"webcheckly/database"
	"webcheckly/models"

	"github.com/google/uuid"
)

// CreateOrder 创建订单（计算USD金额）
func CreateOrder(userID string, orderType models.OrderType, feature *string, amount float64, paymentMethod ...string) (*models.Order, error) {
	// 计算USD金额
	amountUSD, err := ConvertCNYToUSD(amount)
	if err != nil {
		return nil, fmt.Errorf("failed to convert CNY to USD: %w", err)
	}

	creditsAmount := 0
	if orderType == models.OrderTypeCreditsPurchase {
		// 积分购买：1积分=1元
		creditsAmount = int(amount)
	} else if orderType == models.OrderTypeSingleScan && feature != nil {
		// 单次扫描订单：使用积分成本（amount已经是积分成本）
		creditsAmount = int(amount)
	}

	// 默认支付方式为stripe，如果提供了参数则使用参数值
	pm := "stripe"
	if len(paymentMethod) > 0 && paymentMethod[0] != "" {
		pm = paymentMethod[0]
	}

	order := &models.Order{
		ID:            uuid.New().String(),
		UserID:        userID,
		OrderType:     orderType,
		Feature:       feature,
		Amount:        amount,
		AmountUSD:     &amountUSD,
		CreditsAmount: creditsAmount,
		Status:        models.OrderStatusPending,
		PaymentMethod: pm,
		CreatedAt:     time.Now(),
	}

	if err := database.CreateOrder(order); err != nil {
		return nil, err
	}

	return order, nil
}

// GetOrder 获取订单详情
func GetOrder(orderID string) (*models.Order, error) {
	return database.GetOrder(orderID)
}

// UpdateOrderStatus 更新订单状态
func UpdateOrderStatus(orderID string, status models.OrderStatus) error {
	return database.UpdateOrderStatus(orderID, status)
}

// GetUserOrders 获取用户订单列表
func GetUserOrders(userID string, limit, offset int) ([]*models.Order, error) {
	return database.GetUserOrders(userID, limit, offset)
}

// ProcessPayment 处理支付（Stripe）
func ProcessPayment(orderID string, paymentIntentID string) error {
	order, err := database.GetOrder(orderID)
	if err != nil {
		return err
	}

	// 更新订单状态
	if err := database.UpdateOrderStatus(orderID, models.OrderStatusPaid); err != nil {
		return err
	}

	// 如果是积分购买，增加用户积分
	if order.OrderType == models.OrderTypeCreditsPurchase {
		if err := AddCredits(order.UserID, order.CreditsAmount); err != nil {
			return fmt.Errorf("failed to add credits: %w", err)
		}
	}

	return nil
}

// ProcessPayPalPayment 处理PayPal支付
func ProcessPayPalPayment(orderID string, paypalOrderID, paypalPaymentID string) error {
	order, err := database.GetOrder(orderID)
	if err != nil {
		return err
	}

	// 更新订单的PayPal信息
	if err := database.UpdateOrderPayPalInfo(orderID, &paypalOrderID, &paypalPaymentID); err != nil {
		return fmt.Errorf("failed to update PayPal info: %w", err)
	}

	// 更新订单状态
	if err := database.UpdateOrderStatus(orderID, models.OrderStatusPaid); err != nil {
		return err
	}

	// 如果是积分购买，增加用户积分
	if order.OrderType == models.OrderTypeCreditsPurchase {
		if err := AddCredits(order.UserID, order.CreditsAmount); err != nil {
			return fmt.Errorf("failed to add credits: %w", err)
		}
	}

	return nil
}

// RefundOrder 退款
func RefundOrder(orderID string) error {
	order, err := database.GetOrder(orderID)
	if err != nil {
		return err
	}

	if order.Status != models.OrderStatusPaid {
		return fmt.Errorf("order is not paid, cannot refund")
	}

	// 更新订单状态
	if err := database.UpdateOrderStatus(orderID, models.OrderStatusRefunded); err != nil {
		return err
	}

	// 如果是积分购买，扣除积分
	if order.OrderType == models.OrderTypeCreditsPurchase {
		if err := DeductCredits(order.UserID, order.CreditsAmount); err != nil {
			return fmt.Errorf("failed to deduct credits: %w", err)
		}
	}

	return nil
}

// CleanupExpiredOrders 清理过期订单
func CleanupExpiredOrders() error {
	return database.CleanupExpiredOrders()
}
