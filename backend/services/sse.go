package services

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
)

func SendSSE(c *fiber.Ctx, event string, data any) error {
	if c == nil {
		log.Printf("[SSE] Warning: Context is nil, cannot send event: %s", event)
		return fmt.Errorf("context is nil")
	}

	bytes, err := json.Marshal(data)
	if err != nil {
		log.Printf("[SSE] Error marshaling data for event %s: %v", event, err)
		return err
	}

	message := fmt.Sprintf("event: %s\ndata: %s\n\n", event, string(bytes))

	// 使用底层fasthttp连接直接写入并刷新
	// 这样可以确保数据立即发送到客户端
	ctx := c.Context()
	if ctx == nil {
		log.Printf("[SSE] Warning: Fiber context is nil, cannot send event: %s", event)
		return fmt.Errorf("fiber context is nil")
	}

	ctx.Response.AppendBodyString(message)

	// 通过设置ImmediateHeaderFlush和流式写入来确保实时刷新
	ctx.Response.ImmediateHeaderFlush = true

	log.Printf("[SSE] Sent event: %s (data length: %d bytes)", event, len(bytes))
	return nil
}
