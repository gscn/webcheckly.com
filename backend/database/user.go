package database

import (
	"database/sql"
	"strings"
	"time"
	"web-checkly/models"

	"github.com/google/uuid"
)

// CreateUser 创建新用户（支持邀请码）
func CreateUser(email, passwordHash string, invitedBy *uuid.UUID) (*models.User, error) {
	user := &models.User{
		ID:            uuid.New(),
		Email:         email,
		PasswordHash:  passwordHash,
		EmailVerified: false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		InvitedBy:     invitedBy,
	}

	// 生成邀请码（使用用户ID，去掉连字符，前缀INV）
	idStr := strings.ReplaceAll(user.ID.String(), "-", "")
	inviteCode := "INV" + idStr[:29]
	user.InviteCode = &inviteCode

	query := `
		INSERT INTO users (id, email, password_hash, role, email_verified, invite_code, invited_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, email, password_hash, role, email_verified, email_verification_token, 
		          email_verification_expires_at, password_reset_token, password_reset_expires_at,
		          created_at, updated_at, last_login_at, invite_code, invited_by
	`

	var inviteCodePtr, invitedByPtr sql.NullString
	err := DB.QueryRow(
		query,
		user.ID,
		user.Email,
		user.PasswordHash,
		models.UserRoleUser, // 默认角色为user
		user.EmailVerified,
		user.InviteCode,
		invitedBy,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpiresAt,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&inviteCodePtr,
		&invitedByPtr,
	)

	if err != nil {
		return nil, err
	}

	if inviteCodePtr.Valid {
		user.InviteCode = &inviteCodePtr.String
	}
	if invitedByPtr.Valid {
		invitedByUUID, err := uuid.Parse(invitedByPtr.String)
		if err == nil {
			user.InvitedBy = &invitedByUUID
		}
	}

	return user, nil
}

// GetUserByEmail 根据邮箱获取用户
func GetUserByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, role, email_verified, email_verification_token,
		       email_verification_expires_at, password_reset_token, password_reset_expires_at,
		       created_at, updated_at, last_login_at
		FROM users
		WHERE email = $1
	`

	err := DB.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpiresAt,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetUserByID 根据ID获取用户
func GetUserByID(id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, role, email_verified, email_verification_token,
		       email_verification_expires_at, password_reset_token, password_reset_expires_at,
		       created_at, updated_at, last_login_at, invite_code, invited_by
		FROM users
		WHERE id = $1
	`

	var inviteCodePtr, invitedByPtr sql.NullString
	err := DB.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpiresAt,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&inviteCodePtr,
		&invitedByPtr,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if inviteCodePtr.Valid {
		user.InviteCode = &inviteCodePtr.String
	}
	if invitedByPtr.Valid {
		invitedByUUID, err := uuid.Parse(invitedByPtr.String)
		if err == nil {
			user.InvitedBy = &invitedByUUID
		}
	}

	return user, nil
}

// UpdateUserEmailVerification 更新邮箱验证状态
func UpdateUserEmailVerification(userID uuid.UUID, verified bool) error {
	query := `
		UPDATE users
		SET email_verified = $1, email_verification_token = NULL, email_verification_expires_at = NULL
		WHERE id = $2
	`
	_, err := DB.Exec(query, verified, userID)
	return err
}

// SetEmailVerificationToken 设置邮箱验证token
func SetEmailVerificationToken(userID uuid.UUID, token string, expiresAt time.Time) error {
	query := `
		UPDATE users
		SET email_verification_token = $1, email_verification_expires_at = $2
		WHERE id = $3
	`
	_, err := DB.Exec(query, token, expiresAt, userID)
	return err
}

// GetUserByVerificationToken 根据验证token获取用户
func GetUserByVerificationToken(token string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, role, email_verified, email_verification_token,
		       email_verification_expires_at, password_reset_token, password_reset_expires_at,
		       created_at, updated_at, last_login_at
		FROM users
		WHERE email_verification_token = $1
	`

	err := DB.QueryRow(query, token).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpiresAt,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// SetPasswordResetToken 设置密码重置token
func SetPasswordResetToken(userID uuid.UUID, token string, expiresAt time.Time) error {
	query := `
		UPDATE users
		SET password_reset_token = $1, password_reset_expires_at = $2
		WHERE id = $3
	`
	_, err := DB.Exec(query, token, expiresAt, userID)
	return err
}

// GetUserByPasswordResetToken 根据密码重置token获取用户
func GetUserByPasswordResetToken(token string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, role, email_verified, email_verification_token,
		       email_verification_expires_at, password_reset_token, password_reset_expires_at,
		       created_at, updated_at, last_login_at
		FROM users
		WHERE password_reset_token = $1
	`

	err := DB.QueryRow(query, token).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpiresAt,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// UpdatePassword 更新用户密码
func UpdatePassword(userID uuid.UUID, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL
		WHERE id = $2
	`
	_, err := DB.Exec(query, passwordHash, userID)
	return err
}

// UpdateLastLogin 更新最后登录时间
func UpdateLastLogin(userID uuid.UUID) error {
	now := time.Now()
	query := `
		UPDATE users
		SET last_login_at = $1
		WHERE id = $2
	`
	_, err := DB.Exec(query, now, userID)
	return err
}

// GetUserByInviteCode 根据邀请码获取用户
func GetUserByInviteCode(inviteCode string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, role, email_verified, email_verification_token,
		       email_verification_expires_at, password_reset_token, password_reset_expires_at,
		       created_at, updated_at, last_login_at, invite_code, invited_by
		FROM users
		WHERE invite_code = $1
	`

	var inviteCodePtr, invitedByPtr sql.NullString
	err := DB.QueryRow(query, inviteCode).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.EmailVerified,
		&user.EmailVerificationToken,
		&user.EmailVerificationExpiresAt,
		&user.PasswordResetToken,
		&user.PasswordResetExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&inviteCodePtr,
		&invitedByPtr,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if inviteCodePtr.Valid {
		user.InviteCode = &inviteCodePtr.String
	}
	if invitedByPtr.Valid {
		invitedByUUID, err := uuid.Parse(invitedByPtr.String)
		if err == nil {
			user.InvitedBy = &invitedByUUID
		}
	}

	return user, nil
}

// GetAllUsers 获取所有用户列表（管理员功能）
func GetAllUsers(limit, offset int, search string) ([]*models.User, error) {
	query := `
		SELECT id, email, password_hash, role, email_verified, email_verification_token,
		       email_verification_expires_at, password_reset_token, password_reset_expires_at,
		       created_at, updated_at, last_login_at
		FROM users
		WHERE ($1 = '' OR email ILIKE '%' || $1 || '%')
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := DB.Query(query, search, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.EmailVerified,
			&user.EmailVerificationToken,
			&user.EmailVerificationExpiresAt,
			&user.PasswordResetToken,
			&user.PasswordResetExpiresAt,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLoginAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

// GetUserCount 获取用户总数（管理员功能）
func GetUserCount(search string) (int, error) {
	var count int
	query := `
		SELECT COUNT(*)
		FROM users
		WHERE ($1 = '' OR email ILIKE '%' || $1 || '%')
	`
	err := DB.QueryRow(query, search).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// UpdateUserRole 更新用户角色（管理员功能）
func UpdateUserRole(userID uuid.UUID, role string) error {
	query := `
		UPDATE users
		SET role = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := DB.Exec(query, role, userID)
	return err
}

// UpdateUserStatus 更新用户状态（管理员功能）
func UpdateUserStatus(userID uuid.UUID, emailVerified bool) error {
	query := `
		UPDATE users
		SET email_verified = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := DB.Exec(query, emailVerified, userID)
	return err
}

// UpdateUserInfo 更新用户信息（管理员功能，可更新邮箱等）
func UpdateUserInfo(userID uuid.UUID, email string) error {
	query := `
		UPDATE users
		SET email = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := DB.Exec(query, email, userID)
	return err
}

// DeleteUser 删除用户（管理员功能，硬删除）
func DeleteUser(userID uuid.UUID) error {
	// 注意：如果有关联数据，可能需要先删除关联数据
	// 这里使用硬删除，实际项目中可能需要软删除
	query := `DELETE FROM users WHERE id = $1`
	_, err := DB.Exec(query, userID)
	return err
}
