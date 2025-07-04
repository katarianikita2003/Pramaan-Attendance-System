# Instead of chmod and bash, create a PowerShell script
# Save this as setup-zkp.ps1 in backend\scripts\

Write-Host "🔧 Setting up ZKP circuits (Simulation Mode for Windows)..."

# Create directories
New-Item -ItemType Directory -Force -Path "src\zkp\circuits\build"
New-Item -ItemType Directory -Force -Path "src\zkp\circuits\ceremony"
New-Item -ItemType Directory -Force -Path "logs"
New-Item -ItemType Directory -Force -Path "certificates"
New-Item -ItemType Directory -Force -Path "uploads"

Write-Host "✅ Directories created"
Write-Host "⚠️  Running in simulation mode (Circom setup requires WSL on Windows)"