# 部署指南

## 问题：找不到命令错误

### 问题 1: 工具未安装

如果遇到以下错误：
```
exec: "katana": executable file not found in $PATH
exec: "lighthouse": executable file not found in $PATH
```

说明服务器上缺少必要的工具依赖。

### 问题 2: 脚本行尾符错误

如果运行安装脚本时遇到以下错误：
```
install-dependencies.sh: line 2: $'\r': command not found
install-dependencies.sh: line 6: set: -: invalid option
```

这是 Windows/Linux 行尾符问题（CRLF vs LF）。**快速修复方法**：

#### 方法 1: 使用修复脚本（最简单）

```bash
# 上传修复脚本到服务器
scp backend/fix-line-endings.sh user@server:/www/wwwroot/webcheckly/

# 在服务器上执行
bash fix-line-endings.sh install-dependencies.sh
./install-dependencies.sh
```

#### 方法 2: 直接使用命令修复

```bash
# 在服务器上执行以下命令之一来修复行尾符：

# 方法 A: 使用 dos2unix（推荐，如果已安装）
dos2unix install-dependencies.sh

# 方法 B: 使用 sed（大多数 Linux 系统都有）
sed -i 's/\r$//' install-dependencies.sh

# 方法 C: 使用 tr（通用方法，最可靠）
tr -d '\r' < install-dependencies.sh > install-dependencies.sh.fixed
mv install-dependencies.sh.fixed install-dependencies.sh

# 修复后重新运行
chmod +x install-dependencies.sh
./install-dependencies.sh
```

#### 方法 3: 一行命令快速修复

```bash
# 直接在服务器上执行这一行命令即可
tr -d '\r' < install-dependencies.sh > install-dependencies.sh.fixed && mv install-dependencies.sh.fixed install-dependencies.sh && chmod +x install-dependencies.sh && ./install-dependencies.sh
```

## 快速解决方案

### 方法 1: 使用自动安装脚本（推荐）

```bash
# 1. 上传安装脚本到服务器
scp backend/install-dependencies.sh user@server:/www/wwwroot/webcheckly/

# 2. SSH 登录服务器
ssh user@server

# 3. 修复行尾符问题（如果从 Windows 上传）
# 方法 A: 使用 dos2unix（如果已安装）
dos2unix /www/wwwroot/webcheckly/install-dependencies.sh

# 方法 B: 使用 sed（如果没有 dos2unix）
sed -i 's/\r$//' /www/wwwroot/webcheckly/install-dependencies.sh

# 方法 C: 使用 tr（通用方法）
tr -d '\r' < /www/wwwroot/webcheckly/install-dependencies.sh > /www/wwwroot/webcheckly/install-dependencies.sh.fixed
mv /www/wwwroot/webcheckly/install-dependencies.sh.fixed /www/wwwroot/webcheckly/install-dependencies.sh

# 4. 运行安装脚本
cd /www/wwwroot/webcheckly
chmod +x install-dependencies.sh
./install-dependencies.sh
```

**注意**：如果遇到 `$'\r': command not found` 错误，说明文件有 Windows 行尾符，需要先执行步骤 3 中的转换命令。

### 方法 2: 手动安装

#### 安装 Katana

```bash
# 使用 Go 安装（如果已安装 Go）
go install github.com/projectdiscovery/katana/cmd/katana@latest
export PATH="$PATH:$HOME/go/bin"

# 或下载预编译二进制
wget https://github.com/projectdiscovery/katana/releases/latest/download/katana_*_linux_amd64.zip
unzip katana_*_linux_amd64.zip
sudo mv katana /usr/local/bin/
chmod +x /usr/local/bin/katana
```

#### 安装 Lighthouse

```bash
# 1. 安装 Node.js（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 Lighthouse
sudo npm install -g lighthouse

# 3. 验证
lighthouse --version
```

## 验证安装

运行以下命令验证所有工具是否已正确安装：

```bash
katana -version
lighthouse --version
```

如果命令都能正常执行，说明安装成功。

## 常见问题

### 1. 命令已安装但找不到

**问题**：工具已安装但系统找不到命令

**解决方案**：
```bash
# 检查工具位置
which katana
which lighthouse

# 如果不在 PATH 中，添加到 PATH
export PATH="$PATH:/path/to/tool"

# 永久添加到 PATH（编辑 ~/.bashrc）
echo 'export PATH="$PATH:/path/to/tool"' >> ~/.bashrc
source ~/.bashrc
```

### 2. Lighthouse 需要 Chrome/Chromium

Lighthouse 会自动下载 Chromium，但可能需要手动安装：

```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser

# CentOS/RHEL
sudo yum install -y chromium
```

### 3. 权限问题

如果使用 `sudo` 安装工具，确保运行服务的用户有执行权限：

```bash
# 检查权限
ls -l /usr/local/bin/katana
ls -l /usr/local/bin/lighthouse

# 如果权限不足，修改权限
sudo chmod +x /usr/local/bin/katana
sudo chmod +x /usr/local/bin/lighthouse
```

## 配置 systemd 服务（重要）

如果使用 systemd 管理服务，**必须**在服务配置中设置正确的 PATH 环境变量：

### 1. 查找工具的实际路径

```bash
# 查找 katana 路径
which katana
# 输出示例: /home/user/go/bin/katana

# 查找 lighthouse 路径
which lighthouse
# 输出示例: /usr/local/bin/lighthouse 或 /home/user/.npm-global/bin/lighthouse
```

### 2. 创建 systemd 服务文件

```bash
sudo nano /etc/systemd/system/webcheckly.service
```

### 3. 配置服务文件（参考 `webcheckly.service.example`）

```ini
[Unit]
Description=WebCheckly Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=webcheckly
WorkingDirectory=/www/wwwroot/webcheckly
ExecStart=/www/wwwroot/webcheckly/webcheckly-linux-amd64
Restart=always
RestartSec=5

# 环境变量
Environment="DATABASE_URL=postgres://user:password@localhost:5432/webcheckly?sslmode=disable"
Environment="JWT_SECRET=your-secret-key-here"
Environment="PORT=8080"

# 重要：设置 PATH，包含所有工具的路径
# 根据实际安装位置调整
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/home/webcheckly/go/bin:/home/webcheckly/.npm-global/bin"

# 重要：设置 HOME 环境变量（Katana 等工具需要）
# 根据实际运行用户调整
Environment="HOME=/home/webcheckly"

# 可选：如果 Chrome/Chromium 不在标准路径，设置 CHROME_PATH
# Environment="CHROME_PATH=/usr/bin/chromium-browser"

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 4. 重新加载并启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable webcheckly
sudo systemctl start webcheckly
sudo systemctl status webcheckly
```

### 5. 检查日志

```bash
# 查看服务日志
sudo journalctl -u webcheckly -f

# 检查是否有命令找不到的错误
sudo journalctl -u webcheckly | grep "command not found"
```

## 部署检查清单

- [ ] PostgreSQL 数据库已安装并运行
- [ ] 数据库已创建并运行迁移
- [ ] Katana 已安装并在 PATH 中
- [ ] Lighthouse 已安装并在 PATH 中
- [ ] httpx 已安装（可选，用于快速链接检查）
- [ ] 环境变量已配置（.env 文件）
- [ ] 后端服务可执行文件已上传
- [ ] **systemd 服务配置中已设置正确的 PATH 环境变量**（重要！）
- [ ] 服务已配置为系统服务（systemd/supervisor）

## 相关文档

- `README.md` - 完整的安装和运行说明
- `构建说明.md` - Linux 构建和部署说明
- `install-dependencies.sh` - 自动安装脚本
