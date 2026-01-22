@echo off
REM 设置代码页为 UTF-8 以支持中文显示
chcp 65001 >nul 2>&1
REM WebCheckly Backend Linux 构建脚本 (Windows)
REM 用于将 Go 后端程序编译为 Linux 可执行文件

echo ==========================================
echo WebCheckly Backend Linux 构建脚本
echo ==========================================

REM 设置构建参数
set APP_NAME=webcheckly
set VERSION=1.0.0
if exist ..\VERSION (
    for /f "tokens=*" %%i in (..\VERSION) do set VERSION=%%i
)
set BUILD_TIME=%date% %time%

REM 输出目录
set OUTPUT_DIR=dist
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

echo.
echo 构建信息:
echo   应用名称: %APP_NAME%
echo   版本: %VERSION%
echo   构建时间: %BUILD_TIME%
echo.

REM 清理 Go 构建缓存（释放空间）
echo 正在清理 Go 构建缓存...
go clean -cache >nul 2>&1

REM 构建 Linux amd64 版本
echo 正在构建 Linux amd64 版本...
set GOOS=linux
set GOARCH=amd64
go build -trimpath -ldflags "-s -w" -o %OUTPUT_DIR%\%APP_NAME%-linux-amd64 main.go

if %errorlevel% equ 0 (
    echo [成功] Linux amd64 构建成功: %OUTPUT_DIR%\%APP_NAME%-linux-amd64
    dir %OUTPUT_DIR%\%APP_NAME%-linux-amd64
) else (
    echo [失败] Linux amd64 构建失败
    exit /b 1
)

REM 构建 Linux arm64 版本（可选）
echo.
echo 正在构建 Linux arm64 版本...
set GOOS=linux
set GOARCH=arm64
go build -trimpath -ldflags "-s -w" -o %OUTPUT_DIR%\%APP_NAME%-linux-arm64 main.go

if %errorlevel% equ 0 (
    echo [成功] Linux arm64 构建成功: %OUTPUT_DIR%\%APP_NAME%-linux-arm64
    dir %OUTPUT_DIR%\%APP_NAME%-linux-arm64
) else (
    echo [警告] Linux arm64 构建失败（可选）
)

echo.
echo ==========================================
echo 构建完成！
echo ==========================================
echo 输出目录: %OUTPUT_DIR%\
echo.

pause
