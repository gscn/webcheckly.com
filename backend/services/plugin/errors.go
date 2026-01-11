package plugin

import "errors"

// 错误分类
var (
	// ErrTimeout 执行超时
	ErrTimeout = errors.New("execution timeout")

	// ErrDependencyFailed 依赖插件执行失败
	ErrDependencyFailed = errors.New("dependency plugin failed")

	// ErrResourceUnavailable 资源不可用（可重试）
	ErrResourceUnavailable = errors.New("resource unavailable")

	// ErrFatal 致命错误（不可恢复）
	ErrFatal = errors.New("fatal error")
)

// ErrorType 错误类型
type ErrorType string

const (
	ErrorTypeRetryable  ErrorType = "retryable"  // 可重试错误
	ErrorTypeIgnorable  ErrorType = "ignorable"  // 可忽略错误
	ErrorTypeFatal      ErrorType = "fatal"      // 致命错误
	ErrorTypeDependency ErrorType = "dependency" // 依赖错误
)

// ClassifyError 分类错误
func ClassifyError(err error) ErrorType {
	if err == nil {
		return ErrorTypeIgnorable
	}

	errStr := err.Error()

	// 可重试错误
	if err == ErrResourceUnavailable || err == ErrTimeout {
		return ErrorTypeRetryable
	}

	// 依赖错误
	if err == ErrDependencyFailed {
		return ErrorTypeDependency
	}

	// 致命错误
	if err == ErrFatal || err == ErrInvalidInput {
		return ErrorTypeFatal
	}

	// 根据错误信息判断
	if contains(errStr, "timeout") || contains(errStr, "超时") {
		return ErrorTypeRetryable
	}
	if contains(errStr, "connection") || contains(errStr, "连接") {
		return ErrorTypeRetryable
	}
	if contains(errStr, "not found") || contains(errStr, "未找到") {
		return ErrorTypeIgnorable
	}

	// 默认返回可忽略错误（允许部分结果）
	return ErrorTypeIgnorable
}

// IsRetryable 判断错误是否可重试
func IsRetryable(err error) bool {
	return ClassifyError(err) == ErrorTypeRetryable
}

// IsIgnorable 判断错误是否可忽略
func IsIgnorable(err error) bool {
	return ClassifyError(err) == ErrorTypeIgnorable
}

// IsFatal 判断错误是否致命
func IsFatal(err error) bool {
	return ClassifyError(err) == ErrorTypeFatal
}

// contains 检查字符串是否包含子串
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > len(substr) && (s[:len(substr)] == substr ||
			s[len(s)-len(substr):] == substr ||
			containsMiddle(s, substr))))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
