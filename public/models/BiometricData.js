// models/BiometricData.js
import mongoose from 'mongoose';

const BiometricDataSchema = new mongoose.Schema({
    scholarId: { type: String, required: true, index: true },
    type: { type: String, enum: ['fingerprint', 'face'], required: true },
    encryptedData: { type: String, required: true },
    publicKey: { type: String }, // For WebAuthn
    credentialId: { type: String, unique: true, sparse: true },
    faceDescriptor: { type: String }, // Encrypted face descriptor
    hashDID: {
        part1: { type: String, required: true },
        part2: { type: String, required: true }
    },
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    deviceInfo: {
        platform: String,
        userAgent: String
    }
});

// Compound index for efficient queries
BiometricDataSchema.index({ scholarId: 1, type: 1 });

export default mongoose.model('BiometricData', BiometricDataSchema);