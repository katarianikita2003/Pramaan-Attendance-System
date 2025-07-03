// routes/biometric.js
import express from 'express';
import crypto from 'crypto';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import BiometricData from '../public/models/BiometricData.js';
import Scholar from '../public/models/Scholar.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Environment configuration for WebAuthn
const rpName = 'Pramaan Attendance System';
const rpID = process.env.DOMAIN || 'localhost';
const origin = process.env.NODE_ENV === 'production' 
    ? `https://${rpID}` 
    : `http://localhost:${process.env.PORT || 5000}`;

// Encryption helper
class BiometricEncryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.secretKey = Buffer.from(
            process.env.BIOMETRIC_ENCRYPTION_KEY || 
            crypto.randomBytes(32).toString('hex'), 
            'hex'
        );
    }

    encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    decrypt(encryptedData) {
        const decipher = crypto.createDecipheriv(
            this.algorithm, 
            this.secretKey, 
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
}

const encryption = new BiometricEncryption();

// WebAuthn Registration - Step 1: Generate options
router.post('/register/fingerprint/options', authenticateToken, async (req, res) => {
    try {
        const scholar = await Scholar.findOne({ scholarId: req.user.scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: scholar.scholarId,
            userName: scholar.email,
            userDisplayName: scholar.name,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required'
            },
        });

        // Store challenge in session or temporary storage
        req.session.challenge = options.challenge;

        res.json(options);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebAuthn Registration - Step 2: Verify response
router.post('/register/fingerprint/verify', authenticateToken, async (req, res) => {
    try {
        const { credential } = req.body;
        const expectedChallenge = req.session.challenge;

        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (!verification.verified) {
            return res.status(400).json({ error: 'Verification failed' });
        }

        // Generate biometric hash for ZKP
        const biometricHash = crypto.createHash('sha256')
            .update(credential.id + verification.registrationInfo.credentialPublicKey)
            .digest('hex');

        const did = {
            part1: biometricHash.slice(0, 32),
            part2: biometricHash.slice(32, 64)
        };

        // Encrypt and store biometric data
        const encryptedBiometric = encryption.encrypt({
            credentialPublicKey: verification.registrationInfo.credentialPublicKey,
            credentialID: verification.registrationInfo.credentialID,
            counter: verification.registrationInfo.counter
        });

        const biometricData = new BiometricData({
            scholarId: req.user.scholarId,
            type: 'fingerprint',
            encryptedData: JSON.stringify(encryptedBiometric),
            credentialId: credential.id,
            hashDID: did,
            deviceInfo: {
                platform: req.headers['user-agent'],
                userAgent: req.headers['user-agent']
            }
        });

        await biometricData.save();

        // Update scholar with biometric status
        await Scholar.findOneAndUpdate(
            { scholarId: req.user.scholarId },
            { 
                biometricRegistered: true,
                biometricType: 'fingerprint',
                did: `did:pramaan:${did.part1.slice(0, 8)}${did.part2.slice(0, 8)}`
            }
        );

        res.json({ 
            success: true, 
            message: 'Fingerprint registered successfully',
            did: `did:pramaan:${did.part1.slice(0, 8)}${did.part2.slice(0, 8)}`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Face Registration
router.post('/register/face', authenticateToken, async (req, res) => {
    try {
        const { faceDescriptor } = req.body;
        
        if (!faceDescriptor) {
            return res.status(400).json({ error: 'Face descriptor required' });
        }

        // Generate hash from face descriptor
        const biometricHash = crypto.createHash('sha256')
            .update(faceDescriptor)
            .digest('hex');

        const did = {
            part1: biometricHash.slice(0, 32),
            part2: biometricHash.slice(32, 64)
        };

        // Encrypt face descriptor
        const encryptedBiometric = encryption.encrypt({
            descriptor: faceDescriptor,
            timestamp: new Date().toISOString()
        });

        const biometricData = new BiometricData({
            scholarId: req.user.scholarId,
            type: 'face',
            encryptedData: JSON.stringify(encryptedBiometric),
            faceDescriptor: faceDescriptor, // Store encrypted
            hashDID: did
        });

        await biometricData.save();

        // Update scholar
        await Scholar.findOneAndUpdate(
            { scholarId: req.user.scholarId },
            { 
                biometricRegistered: true,
                biometricType: 'face',
                did: `did:pramaan:${did.part1.slice(0, 8)}${did.part2.slice(0, 8)}`
            }
        );

        res.json({ 
            success: true, 
            message: 'Face registered successfully',
            did: `did:pramaan:${did.part1.slice(0, 8)}${did.part2.slice(0, 8)}`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;