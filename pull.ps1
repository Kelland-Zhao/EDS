chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "--- 开始同步 ---" -ForegroundColor Cyan

# 1. Git Pull
Write-Host "正在从 GitHub 拉取..." -ForegroundColor Cyan
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull 失败，请检查是否有冲突。" -ForegroundColor Red
}

# 2. Clasp Pull
Write-Host "正在从 Google Apps Script 拉取..." -ForegroundColor Cyan
clasp pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Clasp pull 失败。" -ForegroundColor Red
}

Write-Host "--- 同步完成，可以开始编码 ---" -ForegroundColor Green
