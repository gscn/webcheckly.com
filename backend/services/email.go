package services

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"gopkg.in/mail.v2"
)

// EmailService 邮件服务
type EmailService struct {
	smtpHost     string
	smtpPort     int
	smtpUser     string
	smtpPassword string
	smtpFrom     string
	frontendURL  string
}

// NewEmailService 创建邮件服务实例
func NewEmailService() *EmailService {
	smtpPort := 587
	if portStr := os.Getenv("SMTP_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			smtpPort = p
		}
	}

	return &EmailService{
		smtpHost:     os.Getenv("SMTP_HOST"),
		smtpPort:     smtpPort,
		smtpUser:     os.Getenv("SMTP_USER"),
		smtpPassword: os.Getenv("SMTP_PASSWORD"),
		smtpFrom:     os.Getenv("SMTP_FROM"),
		frontendURL:  os.Getenv("FRONTEND_URL"),
	}
}

// SendVerificationEmail 发送验证邮件
func (s *EmailService) SendVerificationEmail(email, token string) error {
	if s.smtpHost == "" || s.smtpUser == "" || s.smtpPassword == "" {
		log.Printf("[EmailService] SMTP not configured, skipping email send to %s", email)
		log.Printf("[EmailService] To enable email, set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables")
		return nil // 开发环境可能没有配置SMTP，不返回错误
	}

	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", s.frontendURL, token)

	m := mail.NewMessage()
	m.SetHeader("From", s.smtpFrom)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Verify your email address")

	body := fmt.Sprintf(`
Hello,

Thank you for registering with WebCheckly. Please verify your email address by clicking the link below:

%s

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

Best regards,
WebCheckly Team
`, verificationURL)

	m.SetBody("text/plain", body)

	d := mail.NewDialer(s.smtpHost, s.smtpPort, s.smtpUser, s.smtpPassword)

	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	log.Printf("[EmailService] Verification email sent to %s", email)
	return nil
}

// SendPasswordResetEmail 发送密码重置邮件
func (s *EmailService) SendPasswordResetEmail(email, token string) error {
	if s.smtpHost == "" || s.smtpUser == "" || s.smtpPassword == "" {
		log.Printf("[EmailService] SMTP not configured, skipping email send to %s", email)
		log.Printf("[EmailService] To enable email, set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD environment variables")
		return nil // 开发环境可能没有配置SMTP，不返回错误
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.frontendURL, token)

	m := mail.NewMessage()
	m.SetHeader("From", s.smtpFrom)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Reset your password")

	body := fmt.Sprintf(`
Hello,

You requested to reset your password. Click the link below to reset it:

%s

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Best regards,
WebCheckly Team
`, resetURL)

	m.SetBody("text/plain", body)

	d := mail.NewDialer(s.smtpHost, s.smtpPort, s.smtpUser, s.smtpPassword)

	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send password reset email: %w", err)
	}

	log.Printf("[EmailService] Password reset email sent to %s", email)
	return nil
}
