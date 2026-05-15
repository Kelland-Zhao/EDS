param([string]$msg = "")
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. Commit Message：无参数时自动生成时间戳版本号
if (-not $msg) { $msg = "V$(Get-Date -Format 'yyyyMMdd.HHmm')_自动提交" }
Write-Host "📝 Commit: $msg" -ForegroundColor Cyan

# 2. 推送至 Google Apps Script
Write-Host "🚀 正在推送至 Google Apps Script..." -ForegroundColor Cyan
clasp push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Clasp push 失败，操作终止！" -ForegroundColor Red
    exit
}

# 3. Git 推送
Write-Host "📦 正在推送至 Git 仓库..." -ForegroundColor Cyan
git add .
git commit -m $msg
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Git Push 失败！请先运行 pull.ps1 同步远程更新。" -ForegroundColor Yellow
    exit
}

# 4. 同步到 Google Drive（自动检测路径）
$src = $PSScriptRoot
$drivePath = $null
$candidate = "$env:USERPROFILE\Google Drive\050 - Script\EDS"
if (Test-Path $candidate) { $drivePath = $candidate }
if (-not $drivePath) {
    (Get-PSDrive -PSProvider FileSystem).Root | Where-Object { $_ -match '^[A-Z]:\\$' } | ForEach-Object {
        $test = "${_}My Drive\050 - Script\EDS"
        if (Test-Path $test) { $drivePath = $test }
    }
}
if ($drivePath) {
    Write-Host "☁️ 正在同步至 Google Drive: $drivePath" -ForegroundColor Cyan
    robocopy $src $drivePath /MIR /XD ".git" /XF "*.ps1" /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -le 7) {
        Write-Host "✅ 全部同步完成！" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Google Drive 同步失败（robocopy 错误码：$LASTEXITCODE）" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ 未找到 Google Drive 路径，跳过同步。" -ForegroundColor Yellow
}
