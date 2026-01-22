package config

import "os"

// OAuthConfig OAuth配置
type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

// GetOAuthConfig 获取OAuth配置
func GetOAuthConfig() *OAuthConfig {
	return &OAuthConfig{
		GoogleClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
		GoogleRedirectURL:  os.Getenv("GOOGLE_OAUTH_REDIRECT_URL"),
	}
}

// IsGoogleOAuthEnabled 检查Google OAuth是否已配置
func (c *OAuthConfig) IsGoogleOAuthEnabled() bool {
	return c.GoogleClientID != "" && c.GoogleClientSecret != "" && c.GoogleRedirectURL != ""
}

