#!/bin/bash

echo "🔧 Compiling ZKP circuits..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Create build directory
mkdir -p build
mkdir -p keys

# Compile the circuit
echo "📐 Compiling biometric_attendance circuit..."
circom biometric_attendance.circom --r1cs --wasm --sym -o build/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Circuit compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Circuit compiled successfully${NC}"

# Download Powers of Tau if not exists
if [ ! -f "keys/powersOfTau28_hez_final_17.ptau" ]; then
    echo "📥 Downloading Powers of Tau..."
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau \
         -o keys/powersOfTau28_hez_final_17.ptau
fi

# Generate proving and verification keys
echo "🔑 Generating proving and verification keys..."
cd keys

# Setup ceremony
snarkjs groth16 setup ../build/biometric_attendance.r1cs \
        powersOfTau28_hez_final_17.ptau \
        biometric_0000.zkey

# Contribute randomness
echo "🎲 Contributing randomness to the ceremony..."
snarkjs zkey contribute biometric_0000.zkey biometric_0001.zkey \
        --name="First contribution" -v -e="$(head -n 4096 /dev/urandom | tr -d '\0')"

# Apply random beacon
snarkjs zkey beacon biometric_0001.zkey biometric_final.zkey \
        0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Export verification key
echo "📤 Exporting verification key..."
snarkjs zkey export verificationkey biometric_final.zkey verification_key.json

# Export Solidity verifier (optional)
snarkjs zkey export solidityverifier biometric_final.zkey ../contracts/Verifier.sol

echo -e "${GREEN}✅ Circuit setup complete!${NC}"