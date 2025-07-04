# Fix Backend MongoDB Issue
Write-Host "Fixing Backend Setup..." -ForegroundColor Green

# Check if .env exists
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env file from .env.example" -ForegroundColor Yellow
}

# Add MongoDB URI if not present
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "MONGODB_URI") {
    Add-Content ".env" "`nMONGODB_URI=mongodb://localhost:27017/pramaan-attendance"
    Write-Host "Added MONGODB_URI to .env" -ForegroundColor Green
}

# Add JWT_SECRET if not present
if ($envContent -notmatch "JWT_SECRET") {
    Add-Content ".env" "`nJWT_SECRET=e00f94bf2e52a494418477c7883eb448fb24ecff3316d6a8c076bb3b6e5b8ee5f138680e2ebd90e6506f8b5c198a19f88a0fcc3d28546d878599bf3cffd5f33a"
    Write-Host "Added JWT_SECRET to .env" -ForegroundColor Green
}

# Add BIOMETRIC_ENCRYPTION_KEY if not present
if ($envContent -notmatch "BIOMETRIC_ENCRYPTION_KEY") {
    Add-Content ".env" "`nBIOMETRIC_ENCRYPTION_KEY=b7a83496ea9af0a854c4cfbbd5f20b44069f87169233c18723c51b09b2cc29fd"
    Write-Host "Added BIOMETRIC_ENCRYPTION_KEY to .env" -ForegroundColor Green
}

Write-Host "`nSetup fixed! Now:" -ForegroundColor Green
Write-Host "1. Make sure MongoDB is running (mongod)" -ForegroundColor Yellow
Write-Host "2. Run: npm run dev" -ForegroundColor Yellow