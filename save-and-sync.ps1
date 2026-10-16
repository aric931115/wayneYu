param(
    [string]$Message = "更新專案"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$changes = git status --porcelain
if ($LASTEXITCODE -ne 0) {
    throw "無法讀取 Git 狀態，請確認 Git 已安裝且目前資料夾為 Git 專案。"
}

if ([string]::IsNullOrWhiteSpace(($changes -join "`n"))) {
    Write-Host "沒有尚未同步的修改。" -ForegroundColor Green
    exit 0
}

$defaultDate = Get-Date -Format "yyyy-MM-dd"
$syncDate = $null
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$dateStyles = [System.Globalization.DateTimeStyles]::None

while ($true) {
    $dateInput = Read-Host "同步日期 (YYYY-MM-DD) [$defaultDate]"
    if ([string]::IsNullOrWhiteSpace($dateInput)) {
        $dateInput = $defaultDate
    }

    $parsedDate = [datetime]::MinValue
    $isValidDate = [datetime]::TryParseExact(
        $dateInput,
        "yyyy-MM-dd",
        $culture,
        $dateStyles,
        [ref]$parsedDate
    )

    if (-not $isValidDate -or $parsedDate.ToString("yyyy-MM-dd", $culture) -ne $dateInput) {
        Write-Host "[ERROR] 日期無效，請輸入 YYYY-MM-DD。" -ForegroundColor Red
        continue
    }

    $confirmation = Read-Host "請確認這次同步日期為 $dateInput (y/N)"
    if ($confirmation -match "^(y|yes)$") {
        $syncDate = $dateInput
        break
    }

    Write-Host "日期未確認，請重新輸入。" -ForegroundColor Yellow
}

$commitMessage = "sync: $syncDate - $Message"

Write-Host "正在加入修改..." -ForegroundColor Yellow
git add -A
if ($LASTEXITCODE -ne 0) {
    throw "git add 失敗。"
}

Write-Host "正在提交：$commitMessage" -ForegroundColor Yellow
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    throw "git commit 失敗。"
}

Write-Host "正在推送目前分支到 GitHub..." -ForegroundColor Yellow
git push --set-upstream origin HEAD
if ($LASTEXITCODE -ne 0) {
    throw "git push 失敗；本機提交仍已保留，請先同步遠端分支後再重試推送。"
}

Write-Host "同步完成：$syncDate" -ForegroundColor Green
