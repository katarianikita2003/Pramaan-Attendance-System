#!/bin/bash
# backend/zkp-circuits/compile-fixed.sh

echo "🔧 Compiling fixed biometric attendance circuit..."

# Navigate to zkp-circuits directory
cd "$(dirname "$0")"

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ Circom not found. Please ensure it's installed and in PATH"
    exit 1
fi

echo "📐 Compiling circuit..."
circom biometric_attendance.circom --r1cs --wasm --sym --c

if [ $? -ne 0 ]; then
    echo "❌ Circuit compilation failed"
    exit 1
fi

echo "✅ Circuit compiled successfully"

# Check if we already have the powers of tau file
if [ ! -f "pot12_final.ptau" ]; then
    echo "📥 Downloading powers of tau file..."
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -o pot12_final.ptau
fi

echo "🔑 Generating proving key (this may take a moment)..."
snarkjs groth16 setup biometric_attendance.r1cs pot12_final.ptau biometric_0000.zkey

echo "🎲 Contributing randomness..."
snarkjs zkey contribute biometric_0000.zkey biometric_0001.zkey --name="1st Contributor" -v

echo "✨ Applying random beacon..."
snarkjs zkey beacon biometric_0001.zkey biometric_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

echo "📤 Exporting verification key..."
snarkjs zkey export verificationkey biometric_final.zkey verification_key.json

echo "📊 Circuit info:"
snarkjs r1cs info biometric_attendance.r1cs

echo ""
echo "✅ Setup complete! Files generated:"
echo "  - biometric_attendance.r1cs"
echo "  - biometric_attendance_js/"
echo "  - biometric_final.zkey" 
echo "  - verification_key.json"
echo ""
echo "🚀 Your ZKP circuit is ready for production use!"