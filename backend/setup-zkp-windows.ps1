# Windows PowerShell script for setting up ZKP
# Run this from the backend directory

Write-Host "Setting up ZKP for Pramaan on Windows..." -ForegroundColor Green

# Create directory structure
Write-Host "Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path zkp-circuits
New-Item -ItemType Directory -Force -Path zkp-circuits\build
New-Item -ItemType Directory -Force -Path zkp-circuits\keys
New-Item -ItemType Directory -Force -Path zkp-circuits\contracts
New-Item -ItemType Directory -Force -Path zkp-circuits\test

Write-Host "Directories created successfully!" -ForegroundColor Green

# Create a simplified circuit for development
Write-Host "Creating development circuit..." -ForegroundColor Yellow

$circuitContent = @'
pragma circom 2.0.0;

template BiometricCommitment() {
    signal input biometricHash;
    signal input salt;
    signal output commitment;
    
    commitment <== biometricHash + salt;
}

component main = BiometricCommitment();
'@

$circuitContent | Out-File -FilePath zkp-circuits\simple_biometric.circom -Encoding UTF8

Write-Host "Development circuit created!" -ForegroundColor Green

# Create mock proving and verification keys for development
Write-Host "Creating mock keys for development..." -ForegroundColor Yellow

# Mock proving key
"mock_proving_key_for_development" | Out-File -FilePath zkp-circuits\keys\biometric_final.zkey -Encoding UTF8

# Mock verification key
$vKey = @{
    protocol = "groth16"
    curve = "bn128"
    nPublic = 2
    vk_alpha_1 = @("1", "2", "1")
    vk_beta_2 = @(@("1", "2"), @("3", "4"), @("5", "6"))
    vk_gamma_2 = @(@("1", "2"), @("3", "4"), @("5", "6"))
    vk_delta_2 = @(@("1", "2"), @("3", "4"), @("5", "6"))
    IC = @(@("1", "2", "1"), @("1", "2", "1"))
}

$vKey | ConvertTo-Json -Depth 10 | Out-File -FilePath zkp-circuits\keys\verification_key.json -Encoding UTF8

# Create mock WASM file
New-Item -ItemType Directory -Force -Path zkp-circuits\build\biometric_attendance_js
"mock_wasm_content" | Out-File -FilePath zkp-circuits\build\biometric_attendance_js\biometric_attendance.wasm -Encoding UTF8

Write-Host "Mock files created successfully!" -ForegroundColor Green

# Update package.json for zkp-circuits
$packageJson = @{
    name = "pramaan-zkp-circuits"
    version = "1.0.0"
    description = "ZKP circuits for Pramaan (Windows development mode)"
    scripts = @{
        test = "node test/test_circuit.js"
    }
    dependencies = @{
        snarkjs = "^0.7.3"
        circomlibjs = "^0.1.7"
    }
}

$packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath zkp-circuits\package.json -Encoding UTF8

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Note: This is a development setup. For production, you'll need to:" -ForegroundColor Yellow
Write-Host "1. Install Circom 2 from source (requires Rust)" -ForegroundColor Yellow
Write-Host "2. Compile actual circuits" -ForegroundColor Yellow
Write-Host "3. Generate real proving/verification keys" -ForegroundColor Yellow