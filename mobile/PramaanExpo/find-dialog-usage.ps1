# find-dialog-usage.ps1
# Run this in your PramaanExpo directory to find all Dialog usage

$searchPath = "D:\Pramaan - Attendance - System\Pramaan-Attendance-System\mobile\PramaanExpo"

Write-Host "Searching for Dialog usage in: $searchPath" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Search for Dialog imports
Write-Host "`nSearching for Dialog imports..." -ForegroundColor Cyan
$dialogImports = Get-ChildItem -Path $searchPath -Include *.js,*.jsx,*.ts,*.tsx -Recurse | 
    Select-String -Pattern "import.*Dialog.*from.*react-native-paper" -CaseSensitive

if ($dialogImports) {
    Write-Host "Found Dialog imports in:" -ForegroundColor Green
    $dialogImports | ForEach-Object {
        Write-Host "  - $($_.Path):$($_.LineNumber)" -ForegroundColor White
        Write-Host "    $($_.Line.Trim())" -ForegroundColor Gray
    }
} else {
    Write-Host "No Dialog imports found" -ForegroundColor Yellow
}

# Search for Dialog usage
Write-Host "`nSearching for Dialog component usage..." -ForegroundColor Cyan
$dialogUsage = Get-ChildItem -Path $searchPath -Include *.js,*.jsx,*.ts,*.tsx -Recurse | 
    Select-String -Pattern "<Dialog" -CaseSensitive

if ($dialogUsage) {
    Write-Host "Found Dialog usage in:" -ForegroundColor Green
    $dialogUsage | ForEach-Object {
        Write-Host "  - $($_.Path):$($_.LineNumber)" -ForegroundColor White
        Write-Host "    $($_.Line.Trim())" -ForegroundColor Gray
    }
} else {
    Write-Host "No Dialog usage found" -ForegroundColor Yellow
}

# Search for potential Dialog-related components
Write-Host "`nSearching for Dialog-related components..." -ForegroundColor Cyan
$dialogRelated = Get-ChildItem -Path $searchPath -Include *.js,*.jsx,*.ts,*.tsx -Recurse | 
    Select-String -Pattern "Dialog\." -CaseSensitive

if ($dialogRelated) {
    Write-Host "Found Dialog-related components in:" -ForegroundColor Green
    $dialogRelated | ForEach-Object {
        Write-Host "  - $($_.Path):$($_.LineNumber)" -ForegroundColor White
        Write-Host "    $($_.Line.Trim())" -ForegroundColor Gray
    }
}

Write-Host "`nSearch complete!" -ForegroundColor Green
Write-Host "`nTo fix the issue:" -ForegroundColor Yellow
Write-Host "1. Replace App.js with the fixed version" -ForegroundColor White
Write-Host "2. Replace any Dialog usage with SafeDialog component" -ForegroundColor White
Write-Host "3. Clear cache: npx expo start -c" -ForegroundColor White