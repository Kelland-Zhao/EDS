param(
    [string]$m = "update"
)
git add .
git commit -m $m
Write-Host "Git commit done: $m"
