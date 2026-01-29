# 环境变量修复指南

## 问题 1: Lighthouse 无法连接 Chrome

### 错误信息
```
Unable to connect to Chrome
lighthouse command failed: exit status 1
```

### 原因
Lighthouse 需要 Chrome/Chromium 浏览器，但系统未安装或路径不正确。

### 解决方案

#### 步骤 1: 安装 Chromium

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y chromium-browser

# CentOS/RHEL
sudo yum install -y chromium

# 验证安装
chromium-browser --version
# 或
chromium --version
```

#### 步骤 2: 验证 Lighthouse 可以运行

```bash
lighthouse https://example.com --output=json --chrome-flags=--headless --quiet
```

如果仍然失败，检查 Chrome 路径并设置环境变量：

```bash
# 查找 Chrome 路径
which chromium-browser
which chromium
which google-chrome

# 在 systemd 服务文件中设置（如果需要）
Environment="CHROME_PATH=/usr/bin/chromium-browser"
```

## 问题 2: Katana HOME 环境变量未设置

### 错误信息
```
could not get home directory: $HOME is not defined
Katana process exited with error: exit status 1
```

### 原因
Katana 需要 HOME 环境变量，但 systemd 服务默认不设置此变量。

### 解决方案

#### 在 systemd 服务文件中添加 HOME 环境变量

编辑服务文件：
```bash
sudo nano /etc/systemd/system/webcheckly.service
```

在 `[Service]` 部分添加：
```ini
# 重要：设置 HOME 环境变量（Katana 等工具需要）
# 根据实际运行用户调整
Environment="HOME=/home/webcheckly"
```

**注意**：将 `/home/webcheckly` 替换为实际运行服务的用户主目录。

#### 查找用户主目录

```bash
# 查看服务运行用户
sudo systemctl show webcheckly | grep User

# 查看用户主目录
getent passwd webcheckly | cut -d: -f6
# 或
echo ~webcheckly
```

#### 重新加载并重启服务

```bash
sudo systemctl daemon-reload
sudo systemctl restart webcheckly
sudo systemctl status webcheckly
```

## 完整的 systemd 服务配置示例

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

# 环境变量配置
Environment="DATABASE_URL=postgres://user:password@localhost:5432/webcheckly?sslmode=disable"
Environment="JWT_SECRET=your-secret-key-here"
Environment="PORT=8080"

# 重要：设置 PATH 环境变量，包含工具路径
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/home/webcheckly/go/bin:/home/webcheckly/.npm-global/bin"

# 重要：设置 HOME 环境变量（Katana 等工具需要）
Environment="HOME=/home/webcheckly"

# 可选：如果 Chrome/Chromium 不在标准路径，设置 CHROME_PATH
# Environment="CHROME_PATH=/usr/bin/chromium-browser"

StandardOutput=journal
StandardError=journal
SyslogIdentifier=webcheckly

[Install]
WantedBy=multi-user.target
```

## 验证修复

### 检查 Lighthouse

```bash
# 查看日志
sudo journalctl -u webcheckly | grep -i lighthouse

# 应该不再看到 "Unable to connect to Chrome" 错误
```

### 检查 Katana

```bash
# 查看日志
sudo journalctl -u webcheckly | grep -i katana

# 应该不再看到 "$HOME is not defined" 错误
```

## 相关文档

- `webcheckly.service.example` - 完整的服务配置示例
- `DEPLOYMENT.md` - 部署指南
- `TROUBLESHOOTING.md` - 故障排查指南
