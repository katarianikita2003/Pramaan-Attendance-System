#!/bin/bash
# backend/zkp-circuits/setup-circuits.sh

set -e

echo "🔧 Setting up ZKP circuits for Pramaan..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check dependencies
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 not found. Please install $1${NC}"
        echo "Installation guide: $2"
        exit 1
    fi
}

echo "📋 Checking dependencies..."
check_dependency "node" "https://nodejs.org/"
check_dependency "npm" "https://nodejs.org/"
check_dependency "circom" "https://docs.circom.io/getting-started/installation/"

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p build
mkdir -p keys
mkdir -p contracts
mkdir -p test

# Install npm dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Compile the main circuit
echo "📐 Compiling biometric_attendance circuit..."
circom biometric_attendance.circom --r1cs --wasm --sym -o build/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Circuit compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Circuit compiled successfully${NC}"

# Print circuit statistics
echo ""
echo "📊 Circuit Statistics:"
npx snarkjs r1cs info build/biometric_attendance.r1cs

# Download Powers of Tau file if not exists
PTAU_FILE="keys/powersOfTau28_hez_final_17.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo ""
    echo "📥 Downloading Powers of Tau file (this may take a while)..."
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau -o $PTAU_FILE
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to download Powers of Tau file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Powers of Tau downloaded${NC}"
else
    echo -e "${GREEN}✓ Powers of Tau file already exists${NC}"
fi

# Generate proving and verification keys
echo ""
echo "🔑 Setting up proving and verification keys..."
cd keys

# Initial setup
echo "  → Running initial setup..."
npx snarkjs groth16 setup ../build/biometric_attendance.r1cs powersOfTau28_hez_final_17.ptau biometric_0000.zkey

# First contribution
echo "  → Making first contribution to ceremony..."
npx snarkjs zkey contribute biometric_0000.zkey biometric_0001.zkey \
    --name="Pramaan Team Contribution 1" -v \
    -e="$(head -c 1024 /dev/urandom | base64 | tr -d '\n')"

# Second contribution (for added security)
echo "  → Making second contribution..."
npx snarkjs zkey contribute biometric_0001.zkey biometric_0002.zkey \
    --name="Pramaan Team Contribution 2" -v \
    -e="$(date +%s | sha256sum | base64 | head -c 32)"

# Apply random beacon
echo "  → Applying random beacon..."
npx snarkjs zkey beacon biometric_0002.zkey biometric_final.zkey \
    0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 \
    -n="Final Beacon"

# Export verification key
echo "  → Exporting verification key..."
npx snarkjs zkey export verificationkey biometric_final.zkey verification_key.json

# Verify the final zkey
echo "  → Verifying the final zkey..."
npx snarkjs zkey verify ../build/biometric_attendance.r1cs powersOfTau28_hez_final_17.ptau biometric_final.zkey

# Export Solidity verifier (optional, for blockchain integration)
echo "  → Generating Solidity verifier contract..."
npx snarkjs zkey export solidityverifier biometric_final.zkey ../contracts/BiometricVerifier.sol

# Clean up intermediate files
echo ""
echo "🧹 Cleaning up intermediate files..."
rm -f biometric_0000.zkey biometric_0001.zkey biometric_0002.zkey

cd ..

# Create a simple test to verify everything works
echo ""
echo "🧪 Creating test files..."

cat > test/test_circuit.js << 'EOF'
const snarkjs = require("snarkjs");
const fs = require("fs");

async function testCircuit() {
    console.log("Testing ZKP circuit...");
    
    // Create test input
    const input = {
        // Private inputs
        biometricFeatures: new Array(128).fill(1),
        salt: [123456, 789012],
        
        // Public inputs (these would normally be computed)
        commitment: "1234567890",
        nullifier: "0987654321",
        locationHash: "1111111111",
        timestampHash: "2222222222",
        organizationId: "3333333333"
    };
    
    try {
        console.log("Generating witness...");
        // This will fail with our test values, but shows the circuit loads
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            "../build/biometric_attendance_js/biometric_attendance.wasm",
            "../keys/biometric_final.zkey"
        );
        
        console.log("✅ Circuit test passed!");
    } catch (error) {
        console.log("❌ Circuit test failed (expected with test values)");
        console.log("Error:", error.message);
    }
}

testCircuit().catch(console.error);
EOF

# Generate example environment variables
echo ""
echo "📝 Generating example environment configuration..."

cat > .env.example << EOF
# ZKP Configuration
ZKP_MODE=production
CIRCUIT_PATH=./zkp-circuits
SALT_ENCRYPTION_KEY=your-256-bit-encryption-key-here
PROOF_SIGNING_KEY=your-proof-signing-key-here

# Circuit Paths
WASM_PATH=./zkp-circuits/build/biometric_attendance_js/biometric_attendance.wasm
ZKEY_PATH=./zkp-circuits/keys/biometric_final.zkey
VKEY_PATH=./zkp-circuits/keys/verification_key.json
EOF

# Create README for the circuits
cat > README.md << EOF
# Pramaan ZKP Circuits

This directory contains the Zero-Knowledge Proof circuits for the Pramaan attendance system.

## Structure

- \`biometric_attendance.circom\` - Main circuit for biometric proof generation
- \`build/\` - Compiled circuit files
- \`keys/\` - Proving and verification keys
- \`contracts/\` - Solidity verifier contract
- \`test/\` - Test scripts

## Circuit Details

The biometric attendance circuit proves:
1. Knowledge of biometric features that hash to a stored commitment
2. The same biometric features produce a consistent nullifier
3. Attendance was marked at a specific location and time

### Inputs

**Private (hidden):**
- \`biometricFeatures[128]\` - Feature vector from biometric
- \`salt[2]\` - Random salt for privacy

**Public (visible):**
- \`commitment\` - Stored biometric commitment
- \`nullifier\` - Unique identifier preventing duplicates
- \`locationHash\` - Hash of location coordinates
- \`timestampHash\` - Hash of timestamp
- \`organizationId\` - Organization identifier

## Setup

Run \`./setup-circuits.sh\` to compile circuits and generate keys.

## Security Notes

1. The Powers of Tau ceremony file is reused from Hermez
2. Additional contributions are made during setup
3. Keys should be audited before production use
4. Never share the proving key publicly
EOF

# Final summary
echo ""
echo -e "${GREEN}✅ ZKP Circuit Setup Complete!${NC}"
echo ""
echo "📊 Summary:"
echo "   - Circuit: build/biometric_attendance.r1cs"
echo "   - WASM: build/biometric_attendance_js/biometric_attendance.wasm"
echo "   - Proving key: keys/biometric_final.zkey"
echo "   - Verification key: keys/verification_key.json"
echo "   - Solidity verifier: contracts/BiometricVerifier.sol"
echo ""
echo -e "${YELLOW}⚠️  Important Next Steps:${NC}"
echo "   1. Copy .env.example to .env and update values"
echo "   2. Run 'npm test' to verify the setup"
echo "   3. Audit the circuit before production use"
echo "   4. Secure the proving key appropriately"
echo ""
echo "Happy building! 🚀"