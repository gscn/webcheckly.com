package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// GetDB 获取数据库连接（用于其他包访问）
func GetDB() *sql.DB {
	return DB
}

// InitDB 初始化数据库连接
func InitDB() error {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	var err error
	DB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// 测试连接
	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// 设置连接池参数
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Println("[Database] Connected to PostgreSQL successfully")
	return nil
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// RunMigrations 执行数据库迁移
func RunMigrations() error {
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		log.Printf("[Migrations] Migrations directory not found: %s, skipping migrations", migrationsDir)
		return nil
	}

	// 创建 migrations 表（如果不存在）
	if err := createMigrationsTable(); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// 读取迁移文件
	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// 按文件名排序
	migrationFiles := []string{}
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".up.sql") {
			migrationFiles = append(migrationFiles, file.Name())
		}
	}
	
	// 对迁移文件进行排序，确保按顺序执行
	sort.Strings(migrationFiles)

	// 执行每个迁移
	for _, fileName := range migrationFiles {
		migrationName := strings.TrimSuffix(fileName, ".up.sql")

		// 检查是否已执行
		executed, err := isMigrationExecuted(migrationName)
		if err != nil {
			return fmt.Errorf("failed to check migration status: %w", err)
		}
		if executed {
			log.Printf("[Migrations] Migration %s already executed, skipping", migrationName)
			continue
		}

		// 读取迁移文件内容
		filePath := filepath.Join(migrationsDir, fileName)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", fileName, err)
		}

		// 执行迁移
		if _, err := DB.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", migrationName, err)
		}

		// 记录迁移
		if err := recordMigration(migrationName); err != nil {
			return fmt.Errorf("failed to record migration %s: %w", migrationName, err)
		}

		log.Printf("[Migrations] Successfully executed migration: %s", migrationName)
	}

	log.Println("[Migrations] All migrations completed successfully")
	return nil
}

// createMigrationsTable 创建迁移记录表
func createMigrationsTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) UNIQUE NOT NULL,
			executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`
	_, err := DB.Exec(query)
	return err
}

// isMigrationExecuted 检查迁移是否已执行
func isMigrationExecuted(name string) (bool, error) {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE name = $1", name).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// recordMigration 记录迁移执行
func recordMigration(name string) error {
	_, err := DB.Exec("INSERT INTO schema_migrations (name) VALUES ($1)", name)
	return err
}
