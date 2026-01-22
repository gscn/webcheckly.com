@echo off
REM 设置代码页为 UTF-8 以支持中文显示
chcp 65001 >nul 2>&1
REM WebCheckly Backend Linux 构建脚本 (Windows) - 最小化版本
REM 用于在磁盘空间有限的情况下构建 Linux 可执行文件

echo ==========================================
echo WebCheckly Backend Linux 构建脚本 (最小化)
echo ==========================================

REM 清理 Go 构建缓存
echo 正在清理 Go 构建缓存...
go clean -cache
go clean -modcache

REM 设置构建参数
set APP_NAME=webcheckly
set OUTPUT_DIR=dist
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

echo.
echo 构建信息:
echo   应用名称: %APP_NAME%
echo   输出目录: %OUTPUT_DIR%
echo.

REM 构建 Linux amd64 版本（使用最小化标志）
echo 正在构建 Linux amd64 版本（最小化）...
set GOOS=linux
set GOARCH=amd64
go build -trimpath -ldflags "-s -w" -o %OUTPUT_DIR%\%APP_NAME%-linux-amd64 main.go

if %errorlevel% equ 0 (
    echo.
    echo [成功] Linux amd64 构建成功: %OUTPUT_DIR%\%APP_NAME%-linux-amd64
    dir %OUTPUT_DIR%\%APP_NAME%-linux-amd64
    echo.
    echo 文件大小:
    for %%A in (%OUTPUT_DIR%\%APP_NAME%-linux-amd64) do echo   %%~zA 字节
) else (
    echo.
    echo [失败] Linux amd64 构建失败
    echo.
    echo 建议:
    echo 1. 清理磁盘空间（至少需要 2GB 可用空间）
    echo 2. 清理 Go 模块缓存: go clean -modcache
    echo 3. 清理 Go 构建缓存: go clean -cache
    echo 4. 考虑在 Linux 服务器上直接构建
    exit /b 1
)

echo.
echo ==========================================
echo 构建完成！
echo ==========================================
echo 输出文件: %OUTPUT_DIR%\%APP_NAME%-linux-amd64
echo.

pause
