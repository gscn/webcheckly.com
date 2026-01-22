# Windows 上调试 TestSSL 和 WhatWeb 指南

## 一、工具安装

### 1. TestSSL 安装

TestSSL 是一个 Bash 脚本，在 Windows 上需要特殊处理：

#### 方法1：使用 Git Bash（推荐）

1. **安装 Git for Windows**
   - 下载：https://git-scm.com/download/win
   - 安装时会包含 Git Bash

2. **下载 TestSSL**
   ```bash
   # 在 Git Bash 中执行
   cd /c/Users/red/Desktop/WebCheckly
   git clone --depth 1 https://github.com/drwetter/testssl.sh.git testssl
   cd testssl
   chmod +x testssl.sh
   ```

3. **创建 Windows 包装脚本**
   
   在项目根目录创建 `testssl.bat`：
   ```batch
   @echo off
   setlocal
   set PATH=%PATH%;C:\Program Files\Git\bin
   bash.exe "C:\Users\red\Desktop\WebCheckly\testssl\testssl.sh" %*
   ```

4. **添加到 PATH**
   - 将 `testssl.bat` 所在目录添加到系统 PATH
   - 或直接使用完整路径调用

#### 方法2：使用 WSL（Windows Subsystem for Linux）

1. **安装 WSL**
   ```powershell
   wsl --install
   ```

2. **在 WSL 中安装 TestSSL**
   ```bash
   wsl
   git clone --depth 1 https://github.com/drwetter/testssl.sh.git ~/testssl
   cd ~/testssl
   chmod +x testssl.sh
   ```

3. **从 Windows 调用**
   ```batch
   wsl bash ~/testssl/testssl.sh --json --quiet --fast example.com:443
   ```

### 2. WhatWeb 安装

WhatWeb 是 Ruby 工具，在 Windows 上安装：

#### 方法1：使用 RubyInstaller（推荐）

1. **安装 Ruby**
   - 下载 RubyInstaller：https://rubyinstaller.org/
   - 选择 Ruby+Devkit 版本（包含编译工具）
   - 安装时勾选 "Add Ruby executables to your PATH"

2. **安装 WhatWeb**
   ```powershell
   gem install whatweb
   ```

3. **验证安装**
   ```powershell
   whatweb --version
   ```

#### 方法2：使用 Chocolatey

```powershell
choco install ruby
gem install whatweb
```

## 二、手动测试命令

### TestSSL 测试

#### 1. 基本测试（查看原始输出）
```powershell
# 在 Git Bash 中
bash testssl/testssl.sh example.com:443

# 或使用 WSL
wsl bash ~/testssl/testssl.sh example.com:443
```

#### 2. JSON 输出测试
```powershell
# Git Bash
bash testssl/testssl.sh --json example.com:443

# WSL
wsl bash ~/testssl/testssl.sh --json example.com:443
```

#### 3. 快速模式测试（与代码中使用的参数一致）
```powershell
bash testssl/testssl.sh --json --quiet --fast example.com:443
```

#### 4. 输出到文件（便于调试）
```powershell
bash testssl/testssl.sh --json --quiet --fast example.com:443 > testssl_output.json 2>&1
```

**注意**：TestSSL 默认输出到 stderr，所以需要 `2>&1` 重定向。

### WhatWeb 测试

#### 1. 基本测试
```powershell
whatweb https://example.com
```

#### 2. JSON 输出测试（与代码中使用的参数一致）
```powershell
whatweb --log-json --quiet --no-errors https://example.com
```

#### 3. 输出到文件
```powershell
whatweb --log-json --quiet --no-errors https://example.com > whatweb_output.json
```

#### 4. 详细模式（调试时使用）
```powershell
whatweb --log-json https://example.com
```

## 三、在代码中调试

### 1. 启用详细日志

修改 `backend/services/testssl.go` 和 `backend/services/whatweb.go`，添加更多调试日志：

```go
// testssl.go 中添加
log.Printf("[TestSSL] Full command: %v", cmd.Args)
log.Printf("[TestSSL] Working directory: %s", cmd.Dir)
log.Printf("[TestSSL] Environment: %v", cmd.Env)

// whatweb.go 中添加
log.Printf("[WhatWeb] Full command: %v", cmd.Args)
log.Printf("[WhatWeb] Working directory: %s", cmd.Dir)
```

### 2. 查看后端日志

启动后端服务时查看日志输出：

```powershell
cd backend
go run main.go
```

在日志中查找：
- `[TestSSL]` 开头的日志
- `[WhatWeb]` 开头的日志

### 3. 测试单个工具

创建测试文件 `backend/test_tools.go`：

```go
package main

import (
	"context"
	"fmt"
	"log"
	"web-checkly/services"
)

func main() {
	ctx := context.Background()
	
	// 测试 TestSSL
	fmt.Println("Testing TestSSL...")
	result, err := services.RunTestSSL(ctx, "https://example.com")
	if err != nil {
		log.Printf("TestSSL error: %v", err)
	} else {
		fmt.Printf("TestSSL result: %+v\n", result)
	}
	
	// 测试 WhatWeb
	fmt.Println("\nTesting WhatWeb...")
	result2, err := services.RunWhatWeb(ctx, "https://example.com")
	if err != nil {
		log.Printf("WhatWeb error: %v", err)
	} else {
		fmt.Printf("WhatWeb result: %+v\n", result2)
	}
}
```

运行测试：
```powershell
cd backend
go run test_tools.go
```

## 四、常见问题排查

### TestSSL 问题

#### 问题1：找不到 testssl 命令

**症状**：`exec: "testssl": executable file not found in %PATH%`

**解决方案**：
1. 检查 testssl 是否在 PATH 中
   ```powershell
   where testssl
   ```
2. 如果使用 Git Bash，确保路径正确
3. 如果使用 WSL，使用完整路径或创建包装脚本

#### 问题2：输出格式不正确

**症状**：JSON 解析失败

**解决方案**：
1. 检查 testssl 版本（需要支持 `--json` 参数）
   ```powershell
   bash testssl/testssl.sh --version
   ```
2. 手动测试 JSON 输出格式
   ```powershell
   bash testssl/testssl.sh --json example.com:443 2>&1 | head -20
   ```
3. 查看实际输出内容，检查是否符合 JSON 格式

#### 问题3：命令执行超时

**症状**：Context timeout

**解决方案**：
1. 增加超时时间（在 `backend/services/testssl.go` 中）
   ```go
   ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute) // 增加到5分钟
   ```
2. 使用 `--fast` 参数（已在代码中使用）
3. 检查网络连接

### WhatWeb 问题

#### 问题1：找不到 whatweb 命令

**症状**：`exec: "whatweb": executable file not found in %PATH%`

**解决方案**：
1. 检查 Ruby 和 WhatWeb 是否安装
   ```powershell
   ruby --version
   whatweb --version
   ```
2. 检查 PATH 环境变量
   ```powershell
   $env:PATH -split ';' | Select-String ruby
   ```
3. 如果使用 Gem 安装，确保 Gem bin 目录在 PATH 中
   ```powershell
   gem environment
   # 查看 EXECUTABLE DIRECTORY 路径，添加到 PATH
   ```

#### 问题2：JSON 输出格式问题

**症状**：JSON 解析失败

**解决方案**：
1. 检查 WhatWeb 版本（需要支持 `--log-json`）
   ```powershell
   whatweb --version
   ```
2. 手动测试 JSON 输出
   ```powershell
   whatweb --log-json https://example.com
   ```
3. 查看实际输出，检查 JSON 格式

#### 问题3：Ruby 依赖问题

**症状**：`cannot load such file` 或 `gem not found`

**解决方案**：
1. 更新 RubyGems
   ```powershell
   gem update --system
   ```
2. 重新安装 WhatWeb
   ```powershell
   gem uninstall whatweb
   gem install whatweb
   ```

## 五、调试技巧

### 1. 启用详细输出

临时修改代码，移除 `--quiet` 参数：

```go
// testssl.go
cmd := exec.CommandContext(
    ctx,
    "testssl",
    "--json",
    // "--quiet",  // 注释掉这行
    "--fast",
    fmt.Sprintf("%s:%d", host, port),
)

// whatweb.go
cmd := exec.CommandContext(
    ctx,
    "whatweb",
    "--log-json",
    // "--quiet",  // 注释掉这行
    "--no-errors",
    targetURL,
)
```

### 2. 保存原始输出

修改代码保存原始输出到文件：

```go
// testssl.go 中添加
outputFile, _ := os.Create("testssl_debug.json")
defer outputFile.Close()

scanner := bufio.NewScanner(stdout)
for scanner.Scan() {
    line := scanner.Text()
    outputFile.WriteString(line + "\n")  // 保存到文件
    jsonBuffer.WriteString(line)
    jsonBuffer.WriteString("\n")
}
```

### 3. 使用 PowerShell 调试

创建调试脚本 `debug_tools.ps1`：

```powershell
# 测试 TestSSL
Write-Host "Testing TestSSL..." -ForegroundColor Green
$testUrl = "https://example.com"
$host = ([System.Uri]$testUrl).Host
$port = if ($testUrl -match "https") { 443 } else { 80 }

# 使用 Git Bash
& "C:\Program Files\Git\bin\bash.exe" -c "testssl/testssl.sh --json --quiet --fast ${host}:${port}" 2>&1 | Out-File -FilePath "testssl_output.json" -Encoding utf8

Write-Host "TestSSL output saved to testssl_output.json" -ForegroundColor Yellow
Get-Content testssl_output.json | Select-Object -First 20

# 测试 WhatWeb
Write-Host "`nTesting WhatWeb..." -ForegroundColor Green
& whatweb --log-json --quiet --no-errors $testUrl | Out-File -FilePath "whatweb_output.json" -Encoding utf8

Write-Host "WhatWeb output saved to whatweb_output.json" -ForegroundColor Yellow
Get-Content whatweb_output.json
```

运行：
```powershell
.\debug_tools.ps1
```

### 4. 检查进程和环境

```powershell
# 检查 testssl 是否可执行
Get-Command testssl -ErrorAction SilentlyContinue

# 检查 whatweb 是否可执行
Get-Command whatweb -ErrorAction SilentlyContinue

# 检查环境变量
$env:PATH -split ';' | Where-Object { $_ -match 'git|ruby' }
```

## 六、Windows 特定注意事项

### 1. 路径问题

- Windows 使用反斜杠 `\`，但 Git Bash 和 WSL 使用正斜杠 `/`
- 确保路径正确转义
- 使用 `filepath.Join()` 或 `path/filepath` 包处理路径

### 2. 命令执行

- 某些工具可能需要通过 `cmd.exe` 或 `bash.exe` 包装
- 考虑使用 `exec.Command("cmd", "/c", "command")` 或 `exec.Command("bash", "-c", "command")`

### 3. 输出重定向

- TestSSL 输出到 stderr，需要特殊处理
- 使用 `cmd.StderrPipe()` 而不是 `cmd.StdoutPipe()`

### 4. 编码问题

- Windows 默认使用 GBK/CP936 编码
- 确保输出使用 UTF-8 编码
- 在 PowerShell 中使用 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`

## 七、推荐的调试流程

1. **验证工具安装**
   ```powershell
   # TestSSL
   bash testssl/testssl.sh --version
   
   # WhatWeb
   whatweb --version
   ```

2. **手动测试命令**
   ```powershell
   # 测试 TestSSL
   bash testssl/testssl.sh --json --quiet --fast example.com:443 2>&1
   
   # 测试 WhatWeb
   whatweb --log-json --quiet --no-errors https://example.com
   ```

3. **检查输出格式**
   - 确认 JSON 格式正确
   - 检查是否有额外输出干扰解析

4. **运行代码测试**
   ```powershell
   cd backend
   go run test_tools.go
   ```

5. **查看后端日志**
   - 启动后端服务
   - 执行深度扫描
   - 查看日志中的 `[TestSSL]` 和 `[WhatWeb]` 输出

6. **对比输出**
   - 对比手动命令输出和代码解析结果
   - 找出差异点

## 八、快速调试命令

### 一键测试脚本

创建 `test_deep_scan_tools.ps1`：

```powershell
param(
    [string]$Url = "https://example.com"
)

Write-Host "=== Testing Deep Scan Tools ===" -ForegroundColor Cyan
Write-Host "Target URL: $Url`n" -ForegroundColor Yellow

# Test TestSSL
Write-Host "[1/2] Testing TestSSL..." -ForegroundColor Green
$host = ([System.Uri]$Url).Host
$port = if ($Url -match "https") { 443 } else { 80 }

try {
    $testsslOutput = & "C:\Program Files\Git\bin\bash.exe" -c "testssl/testssl.sh --json --quiet --fast ${host}:${port}" 2>&1
    Write-Host "✓ TestSSL executed successfully" -ForegroundColor Green
    Write-Host "Output length: $($testsslOutput.Length) characters" -ForegroundColor Gray
    if ($testsslOutput.Length -gt 0) {
        $testsslOutput | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
} catch {
    Write-Host "✗ TestSSL failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test WhatWeb
Write-Host "[2/2] Testing WhatWeb..." -ForegroundColor Green
try {
    $whatwebOutput = & whatweb --log-json --quiet --no-errors $Url 2>&1
    Write-Host "✓ WhatWeb executed successfully" -ForegroundColor Green
    Write-Host "Output length: $($whatwebOutput.Length) characters" -ForegroundColor Gray
    if ($whatwebOutput.Length -gt 0) {
        $whatwebOutput | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
} catch {
    Write-Host "✗ WhatWeb failed: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
```

使用方法：
```powershell
.\test_deep_scan_tools.ps1
.\test_deep_scan_tools.ps1 -Url "https://www.baidu.com"
```

## 九、故障排除检查清单

- [ ] TestSSL/WhatWeb 已正确安装
- [ ] 工具在命令行中可以直接运行
- [ ] JSON 输出格式正确
- [ ] 工具在系统 PATH 中，或使用完整路径
- [ ] 后端日志显示命令执行
- [ ] 没有权限问题
- [ ] 网络连接正常
- [ ] 目标 URL 可访问
- [ ] 超时时间足够
- [ ] 输出编码正确（UTF-8）

## 十、获取帮助

如果遇到问题：

1. **查看工具官方文档**
   - TestSSL: https://github.com/drwetter/testssl.sh
   - WhatWeb: https://github.com/urbanadventurer/WhatWeb

2. **检查后端日志**
   - 查看详细的错误信息
   - 检查命令执行情况

3. **使用详细模式**
   - 移除 `--quiet` 参数查看完整输出
   - 检查是否有错误消息

4. **社区支持**
   - GitHub Issues
   - Stack Overflow
