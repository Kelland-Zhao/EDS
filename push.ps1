param([string]$msg = "")
chcp 65001 | Out-Null
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1. Commit Message
if (-not $msg) { $msg = "V$(Get-Date -Format 'yyyyMMdd.HHmm')_auto-commit" }
Write-Host "[INFO] Commit: $msg" -ForegroundColor Cyan

# 2. Push to Google Apps Script
Write-Host "[INFO] Pushing to Google Apps Script..." -ForegroundColor Cyan
clasp push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Clasp push failed!" -ForegroundColor Red
    exit
}

# 3. Git push
Write-Host "[INFO] Pushing to Git..." -ForegroundColor Cyan
git add .
git commit -m $msg
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Git push failed! Run pull.ps1 first." -ForegroundColor Yellow
    exit
}

# 4. Sync to Google Drive (auto-detect path)
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
    Write-Host "[INFO] Syncing to Google Drive: $drivePath" -ForegroundColor Cyan
    robocopy $src $drivePath /MIR /XD ".git" /XF "*.ps1" /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -le 7) {
        Write-Host "[OK] All done!" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Google Drive sync failed (robocopy exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] Google Drive path not found, sync skipped." -ForegroundColor Yellow
}
