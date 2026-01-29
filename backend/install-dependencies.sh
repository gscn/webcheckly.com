#!/bin/bash

# WebCheckly 后端依赖安装脚本
# 用于在 Linux 服务器上安装必要的工具依赖

# 自动修复 Windows CRLF 行尾符问题
if [ -f "$0" ]; then
    # 检查并转换行尾符（如果文件有 CRLF）
    if file "$0" | grep -q "CRLF"; then
        sed -i 's/\r$//' "$0" 2>/dev/null || {
            # 如果 sed -i 不支持，使用临时文件
            sed 's/\r$//' "$0" > "$0.tmp" && mv "$0.tmp" "$0"
        }
    fi
fi

set -e

echo "=========================================="
echo "WebCheckly 后端依赖安装脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

# 安装 Katana
install_katana() {
    echo ""
    echo "正在安装 Katana..."
    
    # 方法1: 使用 Go 安装（如果已安装 Go）
    if command -v go &> /dev/null; then
        echo "使用 Go 安装 Katana..."
        go install github.com/projectdiscovery/katana/cmd/katana@latest
        
        # 确保 Go bin 目录在 PATH 中
        if [ -d "$HOME/go/bin" ]; then
            export PATH="$PATH:$HOME/go/bin"
            echo 'export PATH="$PATH:$HOME/go/bin"' >> ~/.bashrc
        fi
    else
        # 方法2: 下载预编译二进制文件
        echo "Go 未安装，尝试下载预编译二进制..."
        KATANA_VERSION="v1.0.4"
        ARCH=$(uname -m)
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        
        if [ "$ARCH" = "x86_64" ]; then
            ARCH="amd64"
        elif [ "$ARCH" = "aarch64" ]; then
            ARCH="arm64"
        fi
        
        KATANA_URL="https://github.com/projectdiscovery/katana/releases/download/${KATANA_VERSION}/katana_${KATANA_VERSION}_${OS}_${ARCH}.zip"
        
        echo "下载 Katana 从: $KATANA_URL"
        curl -L -o /tmp/katana.zip "$KATANA_URL" || {
            echo -e "${RED}错误: 无法下载 Katana${NC}"
            echo "请手动从 https://github.com/projectdiscovery/katana/releases 下载并安装"
            return 1
        }
        
        unzip -q /tmp/katana.zip -d /tmp/
        sudo mv /tmp/katana /usr/local/bin/katana || mv /tmp/katana ~/bin/katana
        chmod +x /usr/local/bin/katana 2>/dev/null || chmod +x ~/bin/katana 2>/dev/null
        rm /tmp/katana.zip
        
        if [ -d ~/bin ] && [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
            export PATH="$PATH:$HOME/bin"
            echo 'export PATH="$PATH:$HOME/bin"' >> ~/.bashrc
        fi
    fi
    
    if check_command katana; then
        echo -e "${GREEN}Katana 安装成功！${NC}"
        katana -version
    else
        echo -e "${YELLOW}警告: Katana 安装后未在 PATH 中找到，请手动添加到 PATH${NC}"
    fi
}

# 安装 Lighthouse
install_lighthouse() {
    echo ""
    echo "正在安装 Lighthouse..."
    
    # 检查 Node.js 和 npm
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 需要先安装 Node.js${NC}"
        echo "请访问 https://nodejs.org/ 安装 Node.js (推荐 LTS 版本)"
        return 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}错误: npm 未找到${NC}"
        return 1
    fi
    
    echo "使用 npm 全局安装 Lighthouse..."
    sudo npm install -g lighthouse || npm install -g lighthouse
    
    if check_command lighthouse; then
        echo -e "${GREEN}Lighthouse 安装成功！${NC}"
        lighthouse --version
    else
        echo -e "${YELLOW}警告: Lighthouse 安装后未在 PATH 中找到${NC}"
    fi
}

# 安装 httpx（如果未安装）
install_httpx() {
    echo ""
    echo "检查 httpx..."
    
    if check_command httpx; then
        httpx -version
        return 0
    fi
    
    echo "httpx 未安装，正在安装..."
    
    # 方法1: 使用 Go 安装
    if command -v go &> /dev/null; then
        echo "使用 Go 安装 httpx..."
        go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
        
        if [ -d "$HOME/go/bin" ]; then
            export PATH="$PATH:$HOME/go/bin"
            echo 'export PATH="$PATH:$HOME/go/bin"' >> ~/.bashrc
        fi
    else
        # 方法2: 下载预编译二进制
        echo "Go 未安装，尝试下载预编译二进制..."
        HTTPX_VERSION="v1.3.7"
        ARCH=$(uname -m)
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        
        if [ "$ARCH" = "x86_64" ]; then
            ARCH="amd64"
        elif [ "$ARCH" = "aarch64" ]; then
            ARCH="arm64"
        fi
        
        HTTPX_URL="https://github.com/projectdiscovery/httpx/releases/download/${HTTPX_VERSION}/httpx_${HTTPX_VERSION}_${OS}_${ARCH}.zip"
        
        echo "下载 httpx 从: $HTTPX_URL"
        curl -L -o /tmp/httpx.zip "$HTTPX_URL" || {
            echo -e "${YELLOW}警告: 无法下载 httpx，请手动安装${NC}"
            return 1
        }
        
        unzip -q /tmp/httpx.zip -d /tmp/
        sudo mv /tmp/httpx /usr/local/bin/httpx || mv /tmp/httpx ~/bin/httpx
        chmod +x /usr/local/bin/httpx 2>/dev/null || chmod +x ~/bin/httpx 2>/dev/null
        rm /tmp/httpx.zip
        
        if [ -d ~/bin ] && [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
            export PATH="$PATH:$HOME/bin"
            echo 'export PATH="$PATH:$HOME/bin"' >> ~/.bashrc
        fi
    fi
    
    if check_command httpx; then
        echo -e "${GREEN}httpx 安装成功！${NC}"
        httpx -version
    else
        echo -e "${YELLOW}警告: httpx 安装后未在 PATH 中找到${NC}"
    fi
}

# 主安装流程
main() {
    echo "检查已安装的工具..."
    echo ""
    
    KATANA_INSTALLED=0
    LIGHTHOUSE_INSTALLED=0
    HTTPX_INSTALLED=0
    
    if check_command katana; then
        KATANA_INSTALLED=1
    fi
    
    if check_command lighthouse; then
        LIGHTHOUSE_INSTALLED=1
    fi
    
    if check_command httpx; then
        HTTPX_INSTALLED=1
    fi
    
    echo ""
    echo "=========================================="
    echo "开始安装缺失的工具..."
    echo "=========================================="
    
    if [ $KATANA_INSTALLED -eq 0 ]; then
        install_katana
    fi
    
    if [ $LIGHTHOUSE_INSTALLED -eq 0 ]; then
        install_lighthouse
    fi
    
    if [ $HTTPX_INSTALLED -eq 0 ]; then
        install_httpx
    fi
    
    echo ""
    echo "=========================================="
    echo "安装完成！验证安装..."
    echo "=========================================="
    echo ""
    
    # 重新加载 PATH
    if [ -f ~/.bashrc ]; then
        source ~/.bashrc 2>/dev/null || true
    fi
    
    ALL_OK=1
    
    if check_command katana; then
        katana -version
    else
        echo -e "${RED}✗ Katana 未正确安装${NC}"
        ALL_OK=0
    fi
    
    echo ""
    
    if check_command lighthouse; then
        lighthouse --version
    else
        echo -e "${RED}✗ Lighthouse 未正确安装${NC}"
        ALL_OK=0
    fi
    
    echo ""
    
    if check_command httpx; then
        httpx -version
    else
        echo -e "${YELLOW}⚠ httpx 未安装（可选，用于链接健康检查）${NC}"
    fi
    
    echo ""
    
    if [ $ALL_OK -eq 1 ]; then
        echo -e "${GREEN}=========================================="
        echo "所有必需工具已成功安装！"
        echo "==========================================${NC}"
    else
        echo -e "${YELLOW}=========================================="
        echo "部分工具安装失败，请检查错误信息"
        echo "==========================================${NC}"
        exit 1
    fi
}

# 运行主函数
main
