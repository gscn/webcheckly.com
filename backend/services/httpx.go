package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"

	"web-checkly/models"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func RunHttpx(ctx context.Context, urls []string, output chan models.HttpxResult) error {
	cmd := exec.CommandContext(
		ctx,
		"httpx",
		"-json",
		"-status-code",
		"-title",
		"-response-time",
		"-ip",
		"-cdn",
		"-tech-detect",   // 启用技术栈检测
		"-timeout", "10", // 增加超时时间到10秒
		"-retries", "1",
		"-threads", "30", // 增加并发线程数
		"-rate-limit", "100", // 增加速率限制
		"-max-host-error", "30", // 最大主机错误数
	)

	// 使用 sync.Once 确保 channel 只关闭一次
	var once sync.Once
	closeChannel := func() {
		once.Do(func() {
			close(output)
		})
	}

	stdin, err := cmd.StdinPipe()
	if err != nil {
		log.Printf("[Httpx] Error creating stdin pipe: %v", err)
		closeChannel()
		return err
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("[Httpx] Error creating stdout pipe: %v", err)
		stdin.Close()
		closeChannel()
		return err
	}

	if err := cmd.Start(); err != nil {
		log.Printf("[Httpx] Error starting httpx command: %v", err)
		stdin.Close()
		stdout.Close()
		closeChannel()
		return err
	}

	// 输入 URL
	go func() {
		defer stdin.Close()
		for _, u := range urls {
			select {
			case <-ctx.Done():
				return
			default:
				if _, err := stdin.Write([]byte(u + "\n")); err != nil {
					log.Printf("[Httpx] Error writing URL to stdin: %v", err)
					return
				}
			}
		}
	}()

	// 读取输出
	go func() {
		defer closeChannel()

		scanner := bufio.NewScanner(stdout)
		hasOutput := false
		lineCount := 0
		parseErrorCount := 0

		for scanner.Scan() {
			select {
			case <-ctx.Done():
				log.Printf("[Httpx] Context cancelled while reading output. Lines read: %d", lineCount)
				return
			default:
				line := scanner.Text()
				lineCount++
				if line == "" {
					continue
				}
				hasOutput = true

				// log.Printf("[Httpx] Received line %d: %s", lineCount, line[:min(100, len(line))])

				// httpx的JSON格式可能使用不同的字段名，需要映射
				var httpxResp map[string]interface{}
				if err := json.Unmarshal([]byte(line), &httpxResp); err != nil {
					parseErrorCount++
					log.Printf("[Httpx] Error parsing JSON (line %d): %v, content: %s", lineCount, err, line[:min(200, len(line))])
					continue
				}

				res := models.HttpxResult{}

				// 字段映射
				if url, ok := httpxResp["url"].(string); ok {
					res.URL = url
				}
				if input, ok := httpxResp["input"].(string); ok && res.URL == "" {
					res.URL = input
				}

				if statusCode, ok := httpxResp["status_code"].(float64); ok {
					res.StatusCode = int(statusCode)
				}

				if title, ok := httpxResp["title"].(string); ok {
					res.Title = title
				}

				if rt, ok := httpxResp["response_time"].(string); ok {
					// httpx返回的response_time可能是字符串（如"312ms"）
					var rtMs int
					fmt.Sscanf(rt, "%dms", &rtMs)
					res.ResponseTime = rtMs
				} else if rt, ok := httpxResp["time"].(string); ok {
					var rtMs int
					fmt.Sscanf(rt, "%dms", &rtMs)
					res.ResponseTime = rtMs
				} else if rt, ok := httpxResp["response_time"].(float64); ok {
					// 也可能是数字类型（毫秒）
					res.ResponseTime = int(rt)
				}

				if ip, ok := httpxResp["ip"].(string); ok {
					res.IP = ip
				}
				if host, ok := httpxResp["host"].(string); ok && res.IP == "" {
					res.IP = host
				}

				if tls, ok := httpxResp["tls"].(bool); ok {
					res.TLS = tls
				} else if tls, ok := httpxResp["tls"].(string); ok { // httpx可能返回"true"/"false"字符串
					res.TLS = strings.ToLower(tls) == "true"
				}

				if cdn, ok := httpxResp["cdn"].(bool); ok {
					res.CDN = cdn
				} else if cdn, ok := httpxResp["cdn"].(string); ok { // httpx可能返回"true"/"false"字符串
					res.CDN = strings.ToLower(cdn) == "true"
				}

				// log.Printf("[Httpx] Parsed result: URL=%s, Status=%d, Title=%s, RT=%dms",
				// 	res.URL, res.StatusCode, res.Title, res.ResponseTime)

				// 在发送前检查 context 是否已取消
				select {
				case <-ctx.Done():
					// log.Printf("[Httpx] Context cancelled while sending result")
					return
				case output <- res:
					// log.Printf("[Httpx] Successfully sent result to channel")
				}
			}
		}

		if err := scanner.Err(); err != nil {
			log.Printf("[Httpx] Scanner error: %v", err)
		}

		log.Printf("[Httpx] Finished reading output. Total lines: %d, Parse errors: %d, Valid results: %d",
			lineCount, parseErrorCount, lineCount-parseErrorCount)

		// 等待命令完成
		log.Printf("[Httpx] Waiting for httpx process to finish...")
		if err := cmd.Wait(); err != nil {
			log.Printf("[Httpx] Httpx process exited with error: %v", err)
			if !hasOutput {
				log.Printf("[Httpx] WARNING: Httpx exited with error and produced no output. This might indicate:")
				log.Printf("[Httpx]   1. Httpx command not found in PATH")
				log.Printf("[Httpx]   2. Httpx execution failed")
				log.Printf("[Httpx]   3. No valid URLs were processed")
			}
		} else {
			log.Printf("[Httpx] Httpx process completed successfully")
		}
	}()

	return nil
}
