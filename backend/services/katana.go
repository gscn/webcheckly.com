package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"
	"time"

	"web-checkly/models"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/transform"
)

// KatanaResult katana发现的页面和资源
type KatanaResult struct {
	URL      string `json:"url"`
	Source   string `json:"source"`   // 来源（如：link, script, css等）
	Method   string `json:"method"`   // HTTP方法
	Status   int    `json:"status"`   // 状态码
	Title    string `json:"title"`    // 页面标题
	Type     string `json:"type"`     // 资源类型（如：html, js, css, image等）
	Length   int64  `json:"length"`   // 内容长度
	Response string `json:"response"` // 响应时间
}

// RunKatana 使用katana进行页面和资源发现
// 如果提供了taskID和taskManager，会实时推送发现的链接
// depth: 爬取深度，1=只爬取当前页面，3=深度爬取（默认3，保持向后兼容）
func RunKatana(ctx context.Context, targetURL string, taskID string, taskManager interface{}, depth ...int) ([]KatanaResult, error) {
	// 默认深度为3（深度爬取），如果指定了depth参数则使用指定值
	crawlDepth := 3
	if len(depth) > 0 && depth[0] > 0 {
		crawlDepth = depth[0]
	}

	// katana命令参数（根据 katana -h 帮助信息）
	// -j, -jsonl: JSON Lines 输出格式
	// -or, -omit-raw: 省略原始请求/响应数据（减少输出大小）
	// -ob, -omit-body: 省略响应体（减少输出大小，提高性能）
	// 注意：使用 -ob 省略响应体以提高性能，title从response.title字段获取
	// -d, -depth: 爬取深度（1=只爬取当前页面，3=深度爬取）
	// -fs, -field-scope: 限制在目标域名范围内（rdn=根域名，默认值）
	// -timeout: 请求超时时间（增加到15秒）
	// -retry: 重试次数（默认1，注意是 -retry 不是 -retries）
	// -c, -concurrency: 并发数（增加到20以提高发现速度）
	// -rd, -delay: 请求延迟（秒，100ms=0.1秒）
	// 注意：katana 默认就是爬取模式，不需要 -crawl 参数
	// 注意：某些版本的katana可能不支持 -p 和 -f 参数，已移除以避免错误
	// 注意：如果Katana版本支持表单发现，可能需要使用 --forms 长格式或特定版本
	depthStr := fmt.Sprintf("%d", crawlDepth)
	cmd := exec.CommandContext(
		ctx,
		"katana",
		"-u", targetURL,
		"-j",           // JSON Lines 输出格式
		"-or",          // 省略原始请求/响应数据
		"-ob",          // 省略响应体（提高性能，减少输出大小，避免token too long错误）
		"-d", depthStr, // 爬取深度（1=只爬取当前页面，3=深度爬取）
		// 注意：移除 -fs rdn 参数，允许发现跨域链接（link-health 需要检查所有链接）
		// "-fs", "rdn", // 限制在根域名范围内（field-scope，默认值）- 已移除以支持跨域链接检查
		"-timeout", "15", // 超时时间（增加到15秒）
		"-retry", "1", // 重试次数（使用 -retry 而不是 -retries）
		"-c", "20", // 并发数（增加到20以提高发现速度）
		// 注意：-rd 只接受整数秒，100ms 延迟太小，使用默认行为（无延迟）或设置为 0
		// "-rd", "0", // 请求延迟（秒，只接受整数）
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("[Katana] Error creating stdout pipe: %v", err)
		return nil, err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		log.Printf("[Katana] Error creating stderr pipe: %v", err)
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		log.Printf("[Katana] Error starting katana command: %v", err)
		return nil, err
	}

	var results []KatanaResult
	var stderrLines []string

	// 读取 stderr（错误信息和日志）
	go func() {
		stderrScanner := bufio.NewScanner(stderr)
		// stderr 通常不会很长，但为了安全也设置较大的缓冲区
		stderrBuf := make([]byte, 0, 64*1024)
		stderrScanner.Buffer(stderrBuf, 1024*1024) // 1MB 应该足够
		for stderrScanner.Scan() {
			line := stderrScanner.Text()
			if line != "" {
				stderrLines = append(stderrLines, line)
				// 只记录非正常日志信息（错误、警告等）
				// katana 的正常启动信息（版本、开始爬取等）不需要记录
				if strings.Contains(strings.ToLower(line), "error") ||
					strings.Contains(strings.ToLower(line), "fatal") ||
					strings.Contains(strings.ToLower(line), "panic") {
					log.Printf("[Katana] Stderr (error): %s", line)
				}
			}
		}
	}()

	// 使用更大的缓冲区来处理超长的JSON行（最大10MB）
	// 默认bufio.Scanner的缓冲区只有64KB，对于包含大量body内容的JSON行不够
	scanner := bufio.NewScanner(stdout)
	const maxBufferSize = 10 * 1024 * 1024 // 10MB
	buf := make([]byte, 0, 64*1024)        // 初始64KB
	scanner.Buffer(buf, maxBufferSize)

	lineCount := 0
	jsonErrorCount := 0

	// 读取JSON输出
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			log.Printf("[Katana] Context cancelled while reading output. Lines read: %d", lineCount)
			cmd.Process.Kill()
			return results, ctx.Err()
		default:
			line := scanner.Text()
			lineCount++
			if line == "" {
				continue
			}

			// 检查是否是有效的 JSON（以 { 或 [ 开头）
			trimmedLine := strings.TrimSpace(line)
			if !strings.HasPrefix(trimmedLine, "{") && !strings.HasPrefix(trimmedLine, "[") {
				// 不是 JSON 格式，可能是错误信息或警告
				jsonErrorCount++
				continue
			}

			var katanaResp map[string]interface{}
			if err := json.Unmarshal([]byte(line), &katanaResp); err != nil {
				log.Printf("[Katana] Error parsing JSON (line %d): %v, content: %s", lineCount, err, line[:min(200, len(line))])
				jsonErrorCount++
				continue
			}

			result := KatanaResult{}

			// 解析URL - katana 实际格式：request.endpoint
			if request, ok := katanaResp["request"].(map[string]interface{}); ok {
				if endpoint, ok := request["endpoint"].(string); ok {
					result.URL = endpoint
				}
				// 解析HTTP方法
				if method, ok := request["method"].(string); ok {
					result.Method = method
				} else {
					result.Method = "GET" // 默认GET
				}
			}
			// 兼容旧格式
			if result.URL == "" {
				if url, ok := katanaResp["url"].(string); ok {
					result.URL = url
				} else if input, ok := katanaResp["input"].(string); ok {
					result.URL = input
				}
			}

			// 解析来源
			if source, ok := katanaResp["source"].(string); ok {
				result.Source = source
			}

			// 解析HTTP方法（如果request中没有）
			if result.Method == "" {
				if method, ok := katanaResp["method"].(string); ok {
					result.Method = method
				} else {
					result.Method = "GET" // 默认GET
				}
			}

			// 解析状态码 - katana 实际格式：response.status_code
			if response, ok := katanaResp["response"].(map[string]interface{}); ok {
				if status, ok := response["status_code"].(float64); ok {
					result.Status = int(status)
				}
				// 解析内容长度
				if length, ok := response["content_length"].(float64); ok {
					result.Length = int64(length)
				}
				// 解析Content-Type（从headers中）
				if headers, ok := response["headers"].(map[string]interface{}); ok {
					if contentType, ok := headers["Content-Type"].(string); ok {
						result.Type = parseContentType(contentType)
					} else if contentType, ok := headers["content-type"].(string); ok {
						result.Type = parseContentType(contentType)
					}
				}
				// 从response中解析标题（katana可能在response.title或response.body中）
				if title, ok := response["title"].(string); ok && title != "" {
					// 检测并转换编码
					result.Title = detectAndConvertTextEncoding(title, response)
				}
				// 从response中解析响应时间（如果存在）
				if responseTime, ok := response["response_time"].(string); ok && responseTime != "" {
					result.Response = responseTime
				} else if responseTime, ok := response["response_time"].(float64); ok {
					// 如果是数字，转换为字符串（毫秒）
					result.Response = fmt.Sprintf("%.0fms", responseTime)
				} else if responseTime, ok := response["time"].(string); ok && responseTime != "" {
					result.Response = responseTime
				} else if responseTime, ok := response["time"].(float64); ok {
					// 如果是数字，转换为字符串（毫秒）
					result.Response = fmt.Sprintf("%.0fms", responseTime)
				} else if responseTime, ok := response["duration"].(float64); ok {
					// 尝试从duration字段获取（可能是秒）
					result.Response = fmt.Sprintf("%.0fms", responseTime*1000)
				}
			}
			// 兼容旧格式
			if result.Status == 0 {
				if status, ok := katanaResp["status_code"].(float64); ok {
					result.Status = int(status)
				} else if status, ok := katanaResp["status"].(float64); ok {
					result.Status = int(status)
				}
			}
			if result.Length == 0 {
				if length, ok := katanaResp["content_length"].(float64); ok {
					result.Length = int64(length)
				} else if length, ok := katanaResp["length"].(float64); ok {
					result.Length = int64(length)
				}
			}

			// 解析标题 - 优先从response中获取，如果没有则从顶层获取
			if result.Title == "" {
				// 从顶层获取
				if title, ok := katanaResp["title"].(string); ok && title != "" {
					// 检测并转换编码
					result.Title = detectAndConvertTextEncoding(title, katanaResp)
				}
				// 如果还没有，尝试从body中提取（如果body存在且是HTML）
				if result.Title == "" {
					// 从response.body中提取
					if response, ok := katanaResp["response"].(map[string]interface{}); ok {
						if body, ok := response["body"].(string); ok && body != "" {
							// 检测并转换编码
							body = detectAndConvertEncoding(body, response)
							// 简单提取HTML title标签（不区分大小写）
							bodyLower := strings.ToLower(body)
							if idx := strings.Index(bodyLower, "<title>"); idx != -1 {
								if endIdx := strings.Index(bodyLower[idx+7:], "</title>"); endIdx != -1 {
									result.Title = strings.TrimSpace(body[idx+7 : idx+7+endIdx])
								}
							}
						}
					}
					// 从顶层body中提取
					if result.Title == "" {
						if body, ok := katanaResp["body"].(string); ok && body != "" {
							// 检测并转换编码
							body = detectAndConvertEncoding(body, katanaResp)
							// 简单提取HTML title标签（不区分大小写）
							bodyLower := strings.ToLower(body)
							if idx := strings.Index(bodyLower, "<title>"); idx != -1 {
								if endIdx := strings.Index(bodyLower[idx+7:], "</title>"); endIdx != -1 {
									result.Title = strings.TrimSpace(body[idx+7 : idx+7+endIdx])
								}
							}
						}
					}
				}
			}

			// 解析资源类型（如果还没有从headers中获取）
			if result.Type == "" {
				if contentType, ok := katanaResp["content_type"].(string); ok {
					result.Type = parseContentType(contentType)
				} else if tech, ok := katanaResp["tech"].([]interface{}); ok && len(tech) > 0 {
					// 如果没有content_type，尝试从tech推断
					result.Type = "unknown"
				} else {
					// 默认根据状态码判断
					if result.Status >= 200 && result.Status < 300 {
						result.Type = "html" // 默认假设是HTML
					} else {
						result.Type = "unknown"
					}
				}
			}

			// 解析响应时间 - 如果response中没有，尝试从顶层获取
			if result.Response == "" {
				if responseTime, ok := katanaResp["response_time"].(string); ok && responseTime != "" {
					result.Response = responseTime
				} else if responseTime, ok := katanaResp["response_time"].(float64); ok {
					// 如果是数字，转换为字符串
					result.Response = fmt.Sprintf("%.0fms", responseTime)
				} else if responseTime, ok := katanaResp["time"].(string); ok && responseTime != "" {
					result.Response = responseTime
				} else if responseTime, ok := katanaResp["time"].(float64); ok {
					// 如果是数字，转换为字符串
					result.Response = fmt.Sprintf("%.0fms", responseTime)
				}
			}

			if result.URL != "" {
				results = append(results, result)

				// 如果提供了taskManager，实时推送发现的链接
				if taskID != "" && taskManager != nil {
					// 使用接口类型断言（避免循环依赖）
					type TaskManagerInterface interface {
						AppendKatanaResult(taskID string, result interface{}) error
					}
					if tm, ok := taskManager.(TaskManagerInterface); ok {
						// 异步推送，不阻塞主流程
						go func() {
							if err := tm.AppendKatanaResult(taskID, result); err != nil {
								log.Printf("[Katana] Error appending result to task manager: %v", err)
							}
						}()
					}
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[Katana] Scanner error: %v", err)
	}

	// 等待命令完成
	waitErr := cmd.Wait()

	// 检查 stderr 中是否有真正的错误（排除正常日志信息）
	hasRealError := false
	errorMessages := []string{}
	for _, line := range stderrLines {
		lowerLine := strings.ToLower(line)
		// 检查是否是真正的错误信息
		if strings.Contains(lowerLine, "error") &&
			!strings.Contains(lowerLine, "inf") &&
			!strings.Contains(lowerLine, "started") &&
			!strings.Contains(lowerLine, "version") {
			hasRealError = true
			errorMessages = append(errorMessages, line)
		}
	}

	if waitErr != nil {
		log.Printf("[Katana] Katana process exited with error: %v", waitErr)
		// 如果有真正的错误信息，记录它
		if hasRealError {
			log.Printf("[Katana] Real errors in stderr: %v", errorMessages)
		}
		// 如果没有任何结果且有很多 JSON 解析错误，返回错误
		if len(results) == 0 && jsonErrorCount > 0 {
			errMsg := fmt.Sprintf("Katana failed: %v", waitErr)
			if hasRealError {
				errMsg += fmt.Sprintf(" (errors: %s)", strings.Join(errorMessages, "; "))
			}
			return results, fmt.Errorf(errMsg)
		}
		// 即使有错误，如果有部分结果，也返回结果（部分成功）
		if len(results) > 0 {
			log.Printf("[Katana] Returning partial results despite error")
		}
	}

	log.Printf("[Katana] Scan completed. Total results: %d (JSON errors: %d)", len(results), jsonErrorCount)

	// 如果没有任何结果，检查是否是真正的错误
	if len(results) == 0 {
		// 如果有真正的错误，返回错误
		if hasRealError || (waitErr != nil && waitErr.Error() != "exit status 0") {
			errMsg := "No results found"
			if hasRealError {
				errMsg += fmt.Sprintf(" (errors: %s)", strings.Join(errorMessages, "; "))
			}
			if waitErr != nil {
				errMsg += fmt.Sprintf(" (exit error: %v)", waitErr)
			}
			return results, fmt.Errorf(errMsg)
		}
		// 如果没有错误，只是没有发现结果，这是正常情况（可能网站没有链接或需要登录）
		log.Printf("[Katana] No results found, but no errors detected. This may be normal if the site has no crawlable links.")
		// 返回空结果但不返回错误，让调用者决定如何处理
		return results, nil
	}

	return results, nil
}

// parseContentType 从Content-Type解析资源类型
func parseContentType(contentType string) string {
	contentType = strings.ToLower(contentType)
	if strings.Contains(contentType, "text/html") {
		return "html"
	} else if strings.Contains(contentType, "text/css") {
		return "css"
	} else if strings.Contains(contentType, "application/javascript") || strings.Contains(contentType, "text/javascript") {
		return "js"
	} else if strings.Contains(contentType, "image/") {
		return "image"
	} else if strings.Contains(contentType, "application/json") {
		return "json"
	} else if strings.Contains(contentType, "application/xml") || strings.Contains(contentType, "text/xml") {
		return "xml"
	} else if strings.Contains(contentType, "font/") {
		return "font"
	} else if strings.Contains(contentType, "video/") {
		return "video"
	} else if strings.Contains(contentType, "audio/") {
		return "audio"
	}
	return "unknown"
}

// detectAndConvertTextEncoding 检测并转换文本编码（用于title等文本字段）
func detectAndConvertTextEncoding(text string, response map[string]interface{}) string {
	if text == "" {
		return text
	}

	// 首先尝试从response中获取charset信息
	var charset string
	if headers, ok := response["headers"].(map[string]interface{}); ok {
		if contentType, ok := headers["Content-Type"].(string); ok {
			charset = extractCharsetFromContentType(contentType)
		} else if contentType, ok := headers["content-type"].(string); ok {
			charset = extractCharsetFromContentType(contentType)
		}
	}

	// 如果检测到非UTF-8编码，直接转换
	if charset != "" && charset != "UTF-8" && charset != "UTF8" {
		var decoder *transform.Reader

		switch strings.ToUpper(charset) {
		case "GBK", "GB2312", "GB18030":
			decoder = transform.NewReader(strings.NewReader(text), simplifiedchinese.GBK.NewDecoder())
		case "BIG5":
			decoder = transform.NewReader(strings.NewReader(text), simplifiedchinese.GBK.NewDecoder())
		case "ISO-8859-1", "LATIN1":
			decoder = transform.NewReader(strings.NewReader(text), charmap.ISO8859_1.NewDecoder())
		case "WINDOWS-1252":
			decoder = transform.NewReader(strings.NewReader(text), charmap.Windows1252.NewDecoder())
		}

		if decoder != nil {
			decodedBytes, err := io.ReadAll(decoder)
			if err == nil {
				decoded := string(decodedBytes)
				log.Printf("[Katana] Converted text encoding from %s to UTF-8 (length: %d -> %d)", charset, len(text), len(decoded))
				return decoded
			}
		}
	}

	// 如果没有charset信息，尝试检测是否是GBK编码被错误解析为UTF-8导致的乱码
	// GBK编码的中文被错误解析为UTF-8时，会产生特定的乱码模式
	if isLikelyGBKGarbled(text) {
		// 尝试将文本作为GBK字节序列重新解码
		// 首先将UTF-8字符串转换回字节，然后作为GBK解码
		textBytes := []byte(text)
		decoder := transform.NewReader(bytes.NewReader(textBytes), simplifiedchinese.GBK.NewDecoder())
		decodedBytes, err := io.ReadAll(decoder)
		if err == nil {
			decoded := string(decodedBytes)
			// 检查解码后是否包含中文字符，且比原文本更合理
			if containsChinese(decoded) && !isLikelyGBKGarbled(decoded) {
				log.Printf("[Katana] Auto-detected and converted GBK garbled text to UTF-8 (length: %d -> %d)", len(text), len(decoded))
				return decoded
			}
		}
	}

	return text
}

// isLikelyGBKGarbled 检测文本是否可能是GBK编码被错误解析为UTF-8导致的乱码
func isLikelyGBKGarbled(text string) bool {
	if len(text) == 0 {
		return false
	}

	// GBK编码的中文被错误解析为UTF-8时，会产生特定的Unicode字符范围
	// 这些字符通常在U+0080到U+00FF之间，或者是无效的UTF-8序列
	garbledCount := 0
	chineseCount := 0

	for _, r := range text {
		// 检查是否是中文字符（正常情况）
		if r >= 0x4E00 && r <= 0x9FFF {
			chineseCount++
			continue
		}
		// 检查是否是常见的乱码字符范围
		// GBK编码被错误解析时，会产生这些范围的字符
		if (r >= 0x0080 && r <= 0x00FF && r != 0x00A0) || // Latin-1补充字符（除了不间断空格）
			(r >= 0x0100 && r <= 0x017F) || // Latin扩展-A
			(r >= 0x0180 && r <= 0x024F) { // Latin扩展-B
			garbledCount++
		}
	}

	// 如果包含大量乱码字符且没有或很少中文字符，可能是乱码
	if garbledCount > 0 && float64(chineseCount)/float64(len([]rune(text))) < 0.1 {
		// 如果乱码字符占比超过30%，很可能是GBK乱码
		if float64(garbledCount)/float64(len([]rune(text))) > 0.3 {
			return true
		}
	}

	return false
}

// isLikelyGarbled 检测文本是否可能是乱码（保留用于兼容性）
func isLikelyGarbled(text string) bool {
	return isLikelyGBKGarbled(text)
}

// containsChinese 检测文本是否包含中文字符
func containsChinese(text string) bool {
	for _, r := range text {
		if r >= 0x4E00 && r <= 0x9FFF {
			return true
		}
	}
	return false
}

// detectAndConvertEncoding 检测并转换字符编码
func detectAndConvertEncoding(body string, response map[string]interface{}) string {
	// 首先尝试从Content-Type header中获取charset
	var charset string
	if headers, ok := response["headers"].(map[string]interface{}); ok {
		if contentType, ok := headers["Content-Type"].(string); ok {
			charset = extractCharsetFromContentType(contentType)
		} else if contentType, ok := headers["content-type"].(string); ok {
			charset = extractCharsetFromContentType(contentType)
		}
	}

	// 如果header中没有，尝试从HTML meta标签中提取
	if charset == "" {
		bodyLower := strings.ToLower(body)
		// 查找 <meta charset="...">
		if idx := strings.Index(bodyLower, "charset="); idx != -1 {
			start := idx + 8
			end := start
			for end < len(body) && end < start+20 {
				char := body[end]
				if char == '"' || char == '\'' || char == ' ' || char == ';' || char == '>' {
					break
				}
				end++
			}
			if end > start {
				charset = strings.ToUpper(strings.TrimSpace(body[start:end]))
			}
		}
		// 查找 <meta http-equiv="Content-Type" content="...charset=...">
		if charset == "" {
			if idx := strings.Index(bodyLower, "http-equiv"); idx != -1 {
				if contentIdx := strings.Index(bodyLower[idx:], "content="); contentIdx != -1 {
					contentStart := idx + contentIdx + 8
					if body[contentStart] == '"' || body[contentStart] == '\'' {
						contentStart++
					}
					contentEnd := contentStart
					for contentEnd < len(body) && contentEnd < contentStart+200 {
						char := body[contentEnd]
						if char == '"' || char == '\'' || char == '>' {
							break
						}
						contentEnd++
					}
					content := body[contentStart:contentEnd]
					charset = extractCharsetFromContentType(content)
				}
			}
		}
	}

	// 如果检测到非UTF-8编码，进行转换
	if charset != "" && charset != "UTF-8" && charset != "UTF8" {
		var decoder *transform.Reader

		switch strings.ToUpper(charset) {
		case "GBK", "GB2312", "GB18030":
			decoder = transform.NewReader(strings.NewReader(body), simplifiedchinese.GBK.NewDecoder())
		case "BIG5":
			// Big5编码暂时使用GBK解码器（简化处理，因为golang.org/x/text没有直接的Big5解码器）
			// 如果解码失败，会回退到原始文本
			decoder = transform.NewReader(strings.NewReader(body), simplifiedchinese.GBK.NewDecoder())
		case "ISO-8859-1", "LATIN1":
			decoder = transform.NewReader(strings.NewReader(body), charmap.ISO8859_1.NewDecoder())
		case "WINDOWS-1252":
			decoder = transform.NewReader(strings.NewReader(body), charmap.Windows1252.NewDecoder())
		default:
			// 未知编码，尝试GBK（常见的中文编码）
			log.Printf("[Katana] Unknown charset '%s', trying GBK", charset)
			decoder = transform.NewReader(strings.NewReader(body), simplifiedchinese.GBK.NewDecoder())
		}

		if decoder != nil {
			decodedBytes, err := io.ReadAll(decoder)
			if err == nil {
				body = string(decodedBytes)
				log.Printf("[Katana] Converted encoding from %s to UTF-8", charset)
			} else {
				log.Printf("[Katana] Failed to convert encoding from %s: %v", charset, err)
			}
		}
	}

	return body
}

// extractCharsetFromContentType 从Content-Type字符串中提取charset
func extractCharsetFromContentType(contentType string) string {
	contentType = strings.ToLower(contentType)
	if idx := strings.Index(contentType, "charset="); idx != -1 {
		start := idx + 8
		end := start
		for end < len(contentType) && end < start+20 {
			char := contentType[end]
			if char == ';' || char == ' ' || char == '"' || char == '\'' {
				break
			}
			end++
		}
		if end > start {
			return strings.ToUpper(strings.TrimSpace(contentType[start:end]))
		}
	}
	return ""
}

// CollectKatanaResults 收集katana发现的页面和资源（用于插件）
func CollectKatanaResults(targetURL string, taskID string, taskManager interface{}) ([]KatanaResult, error) {
	// 增加超时时间到120秒，因为增加了爬取深度和并发数
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	return RunKatana(ctx, targetURL, taskID, taskManager)
}

// ConvertKatanaToHttpxResults 将Katana结果转换为HttpxResult格式（用于兼容现有系统）
func ConvertKatanaToHttpxResults(katanaResults []KatanaResult) []models.HttpxResult {
	var httpxResults []models.HttpxResult

	for _, kr := range katanaResults {
		httpxResult := models.HttpxResult{
			URL:        kr.URL,
			StatusCode: kr.Status,
			Title:      kr.Title,
		}

		// 解析响应时间（如果存在）
		if kr.Response != "" {
			var rtMs int
			fmt.Sscanf(kr.Response, "%dms", &rtMs)
			httpxResult.ResponseTime = rtMs
		}

		httpxResults = append(httpxResults, httpxResult)
	}

	return httpxResults
}
