package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
	"web-checkly/config"
	"web-checkly/database"
	"web-checkly/models"

	"github.com/google/uuid"
)

// OAuthService OAuth服务（预留接口）
type OAuthService struct{}

// NewOAuthService 创建OAuth服务实例
func NewOAuthService() *OAuthService {
	return &OAuthService{}
}

// InitiateOAuth 生成OAuth授权URL
// provider: "google", "github" 等
func (s *OAuthService) InitiateOAuth(provider string, state string) (string, error) {
	oauthConfig := config.GetOAuthConfig()

	switch provider {
	case "google":
		if !oauthConfig.IsGoogleOAuthEnabled() {
			return "", fmt.Errorf("Google OAuth is not configured")
		}

		authURL := "https://accounts.google.com/o/oauth2/v2/auth"
		params := url.Values{}
		params.Set("client_id", oauthConfig.GoogleClientID)
		params.Set("redirect_uri", oauthConfig.GoogleRedirectURL)
		params.Set("response_type", "code")
		params.Set("scope", "openid email profile")
		params.Set("access_type", "offline")
		params.Set("prompt", "consent")
		params.Set("state", state)

		return fmt.Sprintf("%s?%s", authURL, params.Encode()), nil

	default:
		return "", fmt.Errorf("unsupported OAuth provider: %s", provider)
	}
}

// HandleOAuthCallback 处理OAuth回调
func (s *OAuthService) HandleOAuthCallback(provider string, code string, state string) (*models.User, error) {
	switch provider {
	case "google":
		return s.handleGoogleCallback(code)
	default:
		return nil, fmt.Errorf("unsupported OAuth provider: %s", provider)
	}
}

// handleGoogleCallback 处理Google OAuth回调
func (s *OAuthService) handleGoogleCallback(code string) (*models.User, error) {
	oauthConfig := config.GetOAuthConfig()
	if !oauthConfig.IsGoogleOAuthEnabled() {
		return nil, fmt.Errorf("Google OAuth is not configured")
	}

	// 交换code获取access token
	tokenURL := "https://oauth2.googleapis.com/token"
	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", oauthConfig.GoogleClientID)
	data.Set("client_secret", oauthConfig.GoogleClientSecret)
	data.Set("redirect_uri", oauthConfig.GoogleRedirectURL)
	data.Set("grant_type", "authorization_code")

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}

	var tokenResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		IDToken      string `json:"id_token"`
	}

	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	// 获取用户信息
	userInfo, err := s.getGoogleUserInfo(tokenResp.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	// 查找或创建用户
	user, err := database.GetUserByEmail(userInfo.Email)
	if err != nil {
		return nil, err
	}

	if user == nil {
		// 创建新用户（OAuth用户不需要密码）
		user = &models.User{
			ID:            uuid.New(),
			Email:         strings.ToLower(userInfo.Email),
			PasswordHash:  "",   // OAuth用户没有密码
			EmailVerified: true, // Google已验证邮箱
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		// 这里应该调用database.CreateUser，但需要修改以支持无密码用户
		// 暂时返回错误，提示需要实现
		return nil, fmt.Errorf("OAuth user creation not yet implemented")
	}

	// 更新或创建OAuth provider记录
	// 这里需要实现database.CreateOrUpdateOAuthProvider
	// 暂时记录日志
	log.Printf("[OAuth] User %s logged in via Google OAuth", user.Email)

	return user, nil
}

// getGoogleUserInfo 获取Google用户信息
func (s *OAuthService) getGoogleUserInfo(accessToken string) (*GoogleUserInfo, error) {
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo GoogleUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

// GoogleUserInfo Google用户信息
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// GetUserInfo 获取第三方用户信息（通用接口）
func (s *OAuthService) GetUserInfo(provider string, accessToken string) (interface{}, error) {
	switch provider {
	case "google":
		return s.getGoogleUserInfo(accessToken)
	default:
		return nil, fmt.Errorf("unsupported OAuth provider: %s", provider)
	}
}
