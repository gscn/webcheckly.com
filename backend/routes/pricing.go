package routes

import (
	"web-checkly/services"

	"github.com/gofiber/fiber/v2"
)

// GetFeaturePricingHandler 获取所有功能定价（公开接口）
func GetFeaturePricingHandler(c *fiber.Ctx) error {
	pricings, err := services.GetAllPricing()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get feature pricing",
		})
	}

	return c.JSON(pricings)
}
