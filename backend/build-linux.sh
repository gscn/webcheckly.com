#!/bin/bash
# -*- coding: utf-8 -*-

# WebCheckly Backend Linux 构建脚本
# 用于将 Go 后端程序编译为 Linux 可执行文件

# 设置 UTF-8 编码
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8

set -e

echo "=========================================="
echo "WebCheckly Backend Linux 构建脚本"
echo "=========================================="

# 设置构建参数
APP_NAME="webcheckly"
VERSION=$(cat ../VERSION 2>/dev/null || echo "1.0.0")
BUILD_TIME=$(date +"%Y-%m-%d %H:%M:%S")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 输出目录
OUTPUT_DIR="dist"
mkdir -p $OUTPUT_DIR

echo ""
echo "构建信息:"
echo "  应用名称: $APP_NAME"
echo "  版本: $VERSION"
echo "  构建时间: $BUILD_TIME"
echo "  Git Commit: $GIT_COMMIT"
echo ""

# 构建 Linux amd64 版本
echo "正在构建 Linux amd64 版本..."
GOOS=linux GOARCH=amd64 go build \
    -ldflags "-X 'main.Version=$VERSION' -X 'main.BuildTime=$BUILD_TIME' -X 'main.GitCommit=$GIT_COMMIT' -s -w" \
    -o $OUTPUT_DIR/${APP_NAME}-linux-amd64 \
    main.go

if [ $? -eq 0 ]; then
    echo "✅ Linux amd64 构建成功: $OUTPUT_DIR/${APP_NAME}-linux-amd64"
    ls -lh $OUTPUT_DIR/${APP_NAME}-linux-amd64
else
    echo "❌ Linux amd64 构建失败"
    exit 1
fi

# 构建 Linux arm64 版本（可选）
echo ""
echo "正在构建 Linux arm64 版本..."
GOOS=linux GOARCH=arm64 go build \
    -ldflags "-X 'main.Version=$VERSION' -X 'main.BuildTime=$BUILD_TIME' -X 'main.GitCommit=$GIT_COMMIT' -s -w" \
    -o $OUTPUT_DIR/${APP_NAME}-linux-arm64 \
    main.go

if [ $? -eq 0 ]; then
    echo "✅ Linux arm64 构建成功: $OUTPUT_DIR/${APP_NAME}-linux-arm64"
    ls -lh $OUTPUT_DIR/${APP_NAME}-linux-arm64
else
    echo "⚠️  Linux arm64 构建失败（可选）"
fi

echo ""
echo "=========================================="
echo "构建完成！"
echo "=========================================="
echo "输出目录: $OUTPUT_DIR/"
echo ""
