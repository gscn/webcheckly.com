# 快速修复：找不到命令错误

## 问题

后端服务运行时提示：
```
exec: "katana": executable file not found in $PATH
exec: "lighthouse": executable file not found in $PATH
```

但通过 SSH 登录后可以正常执行 `katana -version` 和 `lighthouse --version`。

## 原因

这是 **PATH 环境变量问题**。当通过 systemd 等服务管理器运行程序时，PATH 环境变量可能与交互式 shell 中的 PATH 不同。

## 解决方案

### 方案 1: 配置 systemd 服务 PATH（推荐）

1. **查找工具的实际路径**：
```bash
which katana
which lighthouse
```

2. **编辑 systemd 服务文件**：
```bash
sudo nano /etc/systemd/system/webcheckly.service
```

3. **在 [Service] 部分添加 PATH**：
```ini
[Service]
# ... 其他配置 ...

# 重要：设置 PATH，包含所有工具的路径
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/home/youruser/go/bin:/home/youruser/.npm-global/bin"
```

4. **重新加载并重启服务**：
```bash
sudo systemctl daemon-reload
sudo systemctl restart webcheckly
```

### 方案 2: 创建符号链接到系统路径

如果工具安装在用户目录，创建符号链接：

```bash
# 查找工具路径
KATANA_PATH=$(which katana)
LIGHTHOUSE_PATH=$(which lighthouse)

# 创建符号链接到 /usr/local/bin
sudo ln -s "$KATANA_PATH" /usr/local/bin/katana
sudo ln -s "$LIGHTHOUSE_PATH" /usr/local/bin/lighthouse

# 验证
ls -l /usr/local/bin/katana
ls -l /usr/local/bin/lighthouse
```

### 方案 3: 使用代码自动查找（已实现）

最新版本的代码已经实现了智能命令查找功能，会自动在多个常见路径中查找命令。如果仍然失败，请：

1. **重新编译并部署**：
```bash
cd backend
go build -ldflags "-s -w" -o dist/webcheckly-linux-amd64 main.go
```

2. **检查启动日志**：
```bash
sudo journalctl -u webcheckly | grep CommandFinder
```

日志会显示找到的命令路径，如果找不到会显示详细的错误信息。

## 验证修复

1. **检查服务日志**：
```bash
sudo journalctl -u webcheckly -f
```

2. **测试功能**：
访问扫描接口，检查是否还有 "command not found" 错误。

3. **查看命令查找日志**：
```bash
sudo journalctl -u webcheckly | grep "Found"
```

应该看到类似输出：
```
[CommandFinder] Found katana at: /home/user/go/bin/katana
[CommandFinder] Found lighthouse at: /usr/local/bin/lighthouse
```

## 相关文件

- `backend/services/command_finder.go` - 命令查找实现
- `backend/webcheckly.service.example` - systemd 服务配置示例
- `backend/DEPLOYMENT.md` - 完整部署文档
