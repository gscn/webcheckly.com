package services

import (
	"fmt"
	"time"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// CreateOrder 创建订单（美元计费，1美元=100积分）
func CreateOrder(userID string, orderType models.OrderType, feature *string, amount float64, paymentMethod ...string) (*models.Order, error) {
	// amount 现在是美元金额
	amountUSD := amount

	creditsAmount := 0
	if orderType == models.OrderTypeCreditsPurchase {
		// 积分购买：1美元=100积分
		creditsAmount = int(amount * 100)
	} else if orderType == models.OrderTypeSingleScan && feature != nil {
		// 单次扫描订单：amount是美元金额，需要转换为积分
		// 根据功能定价计算积分成本，然后转换为美元
		if feature != nil {
			pricing, err := GetFeaturePricing(*feature)
			if err == nil {
				// 使用功能的积分成本，然后转换为美元（1美元=100积分）
				creditsAmount = pricing.CreditsCost
				amountUSD = float64(creditsAmount) / 100.0
			}
		}
	}

	// 默认支付方式为stripe，如果提供了参数则使用参数值
	pm := "stripe"
	if len(paymentMethod) > 0 && paymentMethod[0] != "" {
		pm = paymentMethod[0]
	}

	// amount和amountUSD现在都是美元金额
	order := &models.Order{
		ID:            uuid.New().String(),
		UserID:        userID,
		OrderType:     orderType,
		Feature:       feature,
		Amount:        amountUSD,  // 美元金额
		AmountUSD:     &amountUSD, // 美元金额（与Amount相同）
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
