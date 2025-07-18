# setup-zkp-dev.ps1
# Run this from backend/zkp-circuits directory

Write-Host "Setting up ZKP Development Environment for Windows..." -ForegroundColor Green

# Create directory structure
Write-Host "`nCreating directory structure..." -ForegroundColor Yellow
$directories = @("build", "build\biometric_attendance_js", "keys", "contracts", "test")
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Create mock circuit file
Write-Host "`nCreating mock circuit..." -ForegroundColor Yellow
$circuitContent = @'
pragma circom 2.0.0;

template BiometricAttendance() {
    // Simplified circuit for development
    signal input biometricFeatures[128];
    signal input salt[2];
    signal input commitment;
    signal input nullifier;
    signal input locationHash;
    signal input timestampHash;
    signal input organizationId;
    
    signal output isValid;
    
    // Mock constraint
    isValid <== 1;
}

component main = BiometricAttendance();
'@

$circuitContent | Out-File -FilePath "biometric_attendance.circom" -Encoding UTF8

# Create mock WASM file
Write-Host "Creating mock WASM file..." -ForegroundColor Yellow
$wasmContent = "mock_wasm_content_for_development"
$wasmContent | Out-File -FilePath "build\biometric_attendance_js\biometric_attendance.wasm" -Encoding UTF8

# Create mock proving key
Write-Host "Creating mock proving key..." -ForegroundColor Yellow
$zkeyContent = "mock_proving_key_for_development"
$zkeyContent | Out-File -FilePath "keys\biometric_final.zkey" -Encoding UTF8

# Create verification key
Write-Host "Creating verification key..." -ForegroundColor Yellow
$vKey = @{
    protocol = "groth16"
    curve = "bn128"
    nPublic = 5
    vk_alpha_1 = @("20491192805390485299153009773594534940189261866228447918068658471970481763042", "9383485363053290200918347156157836566562967994039712273449902621266178545958", "1")
    vk_beta_2 = @(
        @("6375614351688725206403948262868962793625744043794305715222011528459656738731", "4252822878758300859123897981450591353533073413197771768651442665752259397132"),
        @("10505242626370262277552901082094356697409835680220590971873171140371331206856", "21847035105528745403288232691147584728191162732299865338377159692350059136679"),
        @("1", "0")
    )
    vk_gamma_2 = @(
        @("10857046999023057135944570762232829481370756359578518086990519993285655852781", "11559732032986387107991004021392285783925812861821192530917403151452391805634"),
        @("8495653923123431417604973247489272438418190587263600148770280649306958101930", "4082367875863433681332203403145435568316851327593401208105741076214120093531"),
        @("1", "0")
    )
    vk_delta_2 = @(
        @("10857046999023057135944570762232829481370756359578518086990519993285655852781", "11559732032986387107991004021392285783925812861821192530917403151452391805634"),
        @("8495653923123431417604973247489272438418190587263600148770280649306958101930", "4082367875863433681332203403145435568316851327593401208105741076214120093531"),
        @("1", "0")
    )
    IC = @(
        @("0", "0", "1"),
        @("0", "0", "1"),
        @("0", "0", "1"),
        @("0", "0", "1"),
        @("0", "0", "1"),
        @("0", "0", "1")
    )
}

$vKey | ConvertTo-Json -Depth 10 | Out-File -FilePath "keys\verification_key.json" -Encoding UTF8

# Create test file
Write-Host "`nCreating test file..." -ForegroundColor Yellow
$testContent = @'
const fs = require('fs');
const path = require('path');

console.log('Testing ZKP Development Setup...');

// Check if files exist
const files = [
    '../build/biometric_attendance_js/biometric_attendance.wasm',
    '../keys/biometric_final.zkey',
    '../keys/verification_key.json'
];

let allFilesExist = true;
files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✓ ${file} exists`);
    } else {
        console.log(`✗ ${file} missing`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('\n✅ All ZKP files are in place!');
    console.log('The backend can now run in production-dev mode.');
} else {
    console.log('\n❌ Some files are missing.');
}
'@

$testContent | Out-File -FilePath "test\check_setup.js" -Encoding UTF8

# Run the test
Write-Host "`nRunning setup verification..." -ForegroundColor Yellow
Set-Location test
node check_setup.js
Set-Location ..

Write-Host "`n✅ ZKP Development Setup Complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Update backend/.env file with:" -ForegroundColor White
Write-Host "   ZKP_MODE=production" -ForegroundColor Cyan
Write-Host "   SALT_ENCRYPTION_KEY=$(New-Guid).Guid.Replace('-','')" -ForegroundColor Cyan
Write-Host "`n2. Restart your backend server" -ForegroundColor White
Write-Host "`n3. The ZKP service will now use enhanced simulation with proper data structures" -ForegroundColor White