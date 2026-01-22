package services

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"web-checkly/models"

	"github.com/PuerkitoBio/goquery"
)

// CollectWebsiteInfo 收集网站信息
func CollectWebsiteInfo(targetURL string) (*models.WebsiteInfo, error) {
	log.Printf("[WebsiteInfo] Collecting website info from: %s", targetURL)

	// 使用共享的HTTP客户端
	client := &http.Client{
		Timeout: 15 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP status %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	info := &models.WebsiteInfo{}

	// Title
	info.Title = strings.TrimSpace(doc.Find("title").Text())

	// Meta description
	doc.Find("meta[name='description']").Each(func(i int, s *goquery.Selection) {
		if info.Description == "" {
			info.Description = strings.TrimSpace(s.AttrOr("content", ""))
		}
	})

	// Meta keywords
	doc.Find("meta[name='keywords']").Each(func(i int, s *goquery.Selection) {
		keywords := strings.TrimSpace(s.AttrOr("content", ""))
		if keywords != "" {
			info.Keywords = strings.Split(keywords, ",")
			for i := range info.Keywords {
				info.Keywords[i] = strings.TrimSpace(info.Keywords[i])
			}
		}
	})

	// Language
	doc.Find("html").Each(func(i int, s *goquery.Selection) {
		info.Language = strings.TrimSpace(s.AttrOr("lang", ""))
	})

	// Charset
	doc.Find("meta[charset]").Each(func(i int, s *goquery.Selection) {
		if info.Charset == "" {
			info.Charset = strings.ToUpper(strings.TrimSpace(s.AttrOr("charset", "")))
		}
	})
	doc.Find("meta[http-equiv='Content-Type']").Each(func(i int, s *goquery.Selection) {
		if info.Charset == "" {
			content := s.AttrOr("content", "")
			if strings.Contains(strings.ToLower(content), "charset") {
				parts := strings.Split(content, "charset=")
				if len(parts) > 1 {
					info.Charset = strings.ToUpper(strings.TrimSpace(strings.Split(parts[1], ";")[0]))
				}
			}
		}
	})

	// Author
	doc.Find("meta[name='author']").Each(func(i int, s *goquery.Selection) {
		if info.Author == "" {
			info.Author = strings.TrimSpace(s.AttrOr("content", ""))
		}
	})

	// Generator
	doc.Find("meta[name='generator']").Each(func(i int, s *goquery.Selection) {
		if info.Generator == "" {
			info.Generator = strings.TrimSpace(s.AttrOr("content", ""))
		}
	})

	// Viewport
	doc.Find("meta[name='viewport']").Each(func(i int, s *goquery.Selection) {
		if info.Viewport == "" {
			info.Viewport = strings.TrimSpace(s.AttrOr("content", ""))
		}
	})

	// Robots
	doc.Find("meta[name='robots']").Each(func(i int, s *goquery.Selection) {
		if info.Robots == "" {
			info.Robots = strings.TrimSpace(s.AttrOr("content", ""))
		}
	})

	log.Printf("[WebsiteInfo] Collected info: Title=%s, Description=%s", info.Title, info.Description)

	return info, nil
}
