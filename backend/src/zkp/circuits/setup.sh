// ===== backend/src/zkp/circuits/setup.sh =====
#!/bin/bash

echo "🔧 Setting up ZKP circuits for Pramaan..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo -e "${RED}❌ Circom not found. Please install Circom 2.0+${NC}"
    echo "Visit: https://docs.circom.io/getting-started/installation/"
    exit 1
fi

# Create directories
mkdir -p build
mkdir -p ceremony

# Compile circuit
echo "📐 Compiling biometric_auth circuit..."
circom biometric_auth.circom --r1cs --wasm --sym -o build/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Circuit compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Circuit compiled successfully${NC}"

# Check if ceremony files exist
if [ -f "ceremony/pot14_final.ptau" ]; then
    echo "✅ Powers of Tau file exists"
else
    echo "📥 Downloading Powers of Tau file..."
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau -o ceremony/pot14_final.ptau
fi

# Generate zkey
echo "🔑 Generating zkey..."
cd ceremony
snarkjs groth16 setup ../build/biometric_auth.r1cs pot14_final.ptau biometric_auth_0000.zkey

# Contribute to ceremony
echo "🎲 Contributing randomness..."
snarkjs zkey contribute biometric_auth_0000.zkey biometric_auth_0001.zkey --name="First contribution" -v -e="random entropy"

# Apply random beacon
echo "✨ Applying random beacon..."
snarkjs zkey beacon biometric_auth_0001.zkey biometric_auth_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Export verification key
echo "📤 Exporting verification key..."
snarkjs zkey export verificationkey biometric_auth_final.zkey verification_key.json

# Generate Solidity verifier
echo "📝 Generating Solidity verifier..."
snarkjs zkey export solidityverifier biometric_auth_final.zkey ../contracts/BiometricVerifier.sol

echo -e "${GREEN}✅ ZKP setup complete!${NC}"

# Print circuit info
echo ""
echo "📊 Circuit Statistics:"
snarkjs r1cs info ../build/biometric_auth.r1cs

echo ""
echo "✨ Setup completed successfully!"
echo "   - Circuit: build/biometric_auth.r1cs"
echo "   - WASM: build/biometric_auth_js/biometric_auth.wasm"
echo "   - Final zkey: ceremony/biometric_auth_final.zkey"
echo "   - Verification key: ceremony/verification_key.json"
echo "   - Solidity verifier: contracts/BiometricVerifier.sol"
