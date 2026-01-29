# 故障排查指南

## Lighthouse 执行失败

### 错误信息
```
lighthouse command failed: exit status 1
```

### 可能原因和解决方案

#### 1. Chrome/Chromium 未安装或不可用

Lighthouse 需要 Chrome/Chromium 浏览器。错误信息：`Unable to connect to Chrome`

**检查方法**：
```bash
# 检查 Chrome/Chromium
which google-chrome
which chromium-browser
which chromium

# 检查 Lighthouse 是否能找到 Chrome
lighthouse --version

# 测试 Lighthouse 是否能运行
lighthouse https://example.com --output=json --chrome-flags=--headless --quiet
```

**解决方案**：
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

**如果 Chrome 不在标准路径**，在 systemd 服务文件中设置：
```ini
Environment="CHROME_PATH=/usr/bin/chromium-browser"
```

#### 2. 内存不足

Lighthouse 需要较多内存，如果服务器内存不足可能失败。

**检查方法**：
```bash
free -h
```

**解决方案**：
- 增加服务器内存
- 或减少并发 Lighthouse 任务

#### 3. 目标网站无法访问

如果目标网站无法从服务器访问，Lighthouse 会失败。

**检查方法**：
```bash
curl -I https://target-site.com
```

**解决方案**：
- 检查网络连接
- 检查防火墙设置
- 检查目标网站是否可访问

#### 4. 查看详细错误

最新版本的代码会记录 Lighthouse 的 stderr 输出，查看日志：

```bash
sudo journalctl -u webcheckly | grep -A 5 "Lighthouse.*failed"
```

## Katana 执行失败

### 错误信息
```
Katana process exited with error: exit status 1
```

### 可能原因和解决方案

#### 1. HOME 环境变量未设置

错误信息：`could not get home directory: $HOME is not defined`

**解决方案**：
在 systemd 服务文件中添加 HOME 环境变量：
```ini
Environment="HOME=/home/webcheckly"
```

参考 `webcheckly.service.example` 文件中的配置。

#### 2. 目标网站无法访问

**检查方法**：
```bash
katana -u https://target-site.com -d 1
```

**解决方案**：
- 检查网络连接
- 检查目标网站是否可访问
- 某些网站可能有反爬虫保护

#### 3. 超时设置过短

**解决方案**：
代码中已设置 15 秒超时，如果网站响应慢，可能需要增加超时时间。

#### 4. 查看详细错误

最新版本的代码会记录 Katana 的 stderr 输出，查看日志：

```bash
sudo journalctl -u webcheckly | grep -A 10 "Katana.*error"
```

## 数据库权限错误

### 错误信息
```
pq: permission denied for table website_blacklist
pq: permission denied for table user_blacklist
```

### 解决方案

参考 `DATABASE_PERMISSIONS.md` 文件。

**快速修复**：
```sql
GRANT SELECT ON website_blacklist TO your_db_user;
GRANT SELECT ON user_blacklist TO your_db_user;
```

## 通用排查步骤

### 1. 检查服务日志

```bash
# 实时查看日志
sudo journalctl -u webcheckly -f

# 查看最近的错误
sudo journalctl -u webcheckly --since "10 minutes ago" | grep -i error
```

### 2. 检查命令是否可用

```bash
# 检查命令路径
which katana
which lighthouse

# 测试命令执行
katana -version
lighthouse --version
```

### 3. 检查环境变量

```bash
# 检查 PATH
echo $PATH

# 检查服务运行时的环境变量
sudo systemctl show webcheckly | grep PATH
```

### 4. 手动测试命令

```bash
# 测试 Lighthouse
lighthouse https://example.com --output=json --chrome-flags=--headless --quiet

# 测试 Katana
katana -u https://example.com -d 1 -j
```

## 日志级别说明

- `[Lighthouse]` - Lighthouse 相关日志
- `[Katana]` - Katana 相关日志
- `[CommandFinder]` - 命令查找日志
- `[IsWebsiteBlacklisted]` - 黑名单检查日志
- `[IsUserBlacklisted]` - 用户黑名单检查日志

## 相关文档

- `DATABASE_PERMISSIONS.md` - 数据库权限修复指南
- `DEPLOYMENT.md` - 部署指南
- `QUICK_FIX.md` - 快速修复指南
