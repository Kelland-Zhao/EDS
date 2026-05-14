param([string]$msg = "")
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. 自动获取 Commit Message
if (-not $msg) { $msg = Read-Host "Commit message" }

# 2. 强制先同步到 GAS 云端（如果这一步失败，通常是网络或登录问题，直接断开）
Write-Host "🚀 正在推送至 Google Apps Script..." -ForegroundColor Cyan
clasp push
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ Clasp push 失败，操作终止！" -ForegroundColor Red
    exit 
}

# 3. Git 推送流程
Write-Host "📦 正在推送至 Git 仓库..." -ForegroundColor Cyan
git add .
git commit -m $msg

# 执行推送并捕获错误
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Git Push 失败！可能是另一台电脑有更新没拉取。" -ForegroundColor Yellow
    Write-Host "请先运行 'git pull'，解决冲突后再试。" -ForegroundColor Red
    exit
}

# 4. 同步到 Google Drive
$src = $PSScriptRoot
$dst = "O:\My Drive\050 - Script\EDS"
Write-Host "☁️ 正在同步至 Google Drive..." -ForegroundColor Cyan
robocopy $src $dst /MIR /XD ".git" /XF "*.ps1" /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -le 7) {
    Write-Host "✅ 全部同步完成！" -ForegroundColor Green
} else {
    Write-Host "⚠️ Google Drive 同步失败（robocopy 错误码：$LASTEXITCODE）" -ForegroundColor Yellow
}
