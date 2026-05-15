chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. Git Pull
Write-Host "[INFO] Pulling from GitHub..." -ForegroundColor Cyan
$before = git rev-parse HEAD
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git pull failed!" -ForegroundColor Red
    exit
}
$after = git rev-parse HEAD
if ($before -ne $after) {
    Write-Host "[INFO] Changed files:" -ForegroundColor Cyan
    git --no-pager diff --stat $before..$after
}

# 2. Clasp Pull
Write-Host "[INFO] Pulling from Google Apps Script..." -ForegroundColor Cyan
clasp pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Clasp pull failed!" -ForegroundColor Red
    exit
}

Write-Host "[OK] Sync complete." -ForegroundColor Green
