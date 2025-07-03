// server.js - Main Backend Server with Real ZKP and Biometric Hardware Integration
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as snarkjs from 'snarkjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const execAsync = promisify(exec);

// ZKP Simulation Mode Flag
global.ZKP_SIMULATION_MODE = true;
console.log('⚠️  ZKP running in simulation mode');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan-attendance';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
// app.use('/models', express.static('models'));
// // Add this after your other middleware
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
        },
    },
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Add session management for WebAuthn
app.use(session({
    secret: process.env.SESSION_SECRET || 'pramaan-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => {
        console.log('✅ MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('\n📋 Please ensure MongoDB is running:');
        console.log('- Windows: Run "mongod" or start MongoDB service');
        console.log('- macOS: brew services start mongodb-community');
        console.log('- Linux: sudo systemctl start mongod');
        console.log('\nOr run: node setup-mongodb.js for automated setup');
    });

// Schemas
const ScholarSchema = new mongoose.Schema({
    scholarId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    department: { type: String, required: true },
    supervisor: { type: String, required: true },
    biometricCommitment: { type: String, required: true },
    biometricSalt: { type: String, required: true },
    biometricTemplate: { type: String }, // Encrypted biometric template
    biometricType: { type: String, default: 'simulated' }, // webauthn, fingerprint, face, simulated
    webAuthnCredentials: [{
        credentialId: String,
        publicKey: String,
        counter: Number
    }],
    did: { type: String, unique: true, required: true },
    zkpPublicKey: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
    status: { type: String, default: 'active' }
});

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

const AttendanceSchema = new mongoose.Schema({
    scholarId: { type: String, required: true },
    did: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    duration: { type: Number, default: 0 },
    location: {
        name: { type: String, default: 'Main Campus' },
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        accuracy: Number
    },
    zkProof: {
        proof: {
            pi_a: [String],
            pi_b: [[String]],
            pi_c: [String],
            protocol: String,
            curve: String
        },
        publicSignals: [String],
        verificationKey: String,
        isRealProof: { type: Boolean, default: false }
    },
    verified: { type: Boolean, default: false },
    anomalyDetected: { type: Boolean, default: false },
    biometricType: { type: String }
});

const AdminSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    role: { type: String, default: 'admin' },
    permissions: [String],
    lastLogin: Date,
    campusLocation: {
        latitude: { type: Number, default: 25.26 },
        longitude: { type: Number, default: 82.99 },
        radius: { type: Number, default: 500 } // meters
    }
});

const ZKProofSchema = new mongoose.Schema({
    scholarDid: { type: String, required: true },
    proofHash: { type: String, required: true },
    verificationKey: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'verified' },
    purpose: { type: String, required: true }, // 'registration' or 'attendance'
    publicSignals: [String],
    isRealProof: { type: Boolean, default: false }
});

// Models
const Scholar = mongoose.model('Scholar', ScholarSchema);
const BiometricData = mongoose.model('BiometricData', BiometricDataSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const ZKProof = mongoose.model('ZKProof', ZKProofSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'pramaan-secret-key-2024';

// WebAuthn Configuration
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

// Biometric Handler (Enhanced for real hardware)
class BiometricHandler {
    constructor() {
        this.deviceType = this.detectDevice();
    }

    detectDevice() {
        // In a real implementation, this would detect actual hardware
        if (typeof process !== 'undefined' && process.platform === 'win32') {
            return 'windows-hello-available';
        }
        return 'simulated';
    }

    async enrollBiometric(scholarId, biometricData) {
        // Handle different biometric types
        if (biometricData && biometricData.type === 'webauthn') {
            return {
                success: true,
                template: biometricData.publicKey || biometricData.credentialId,
                type: 'webauthn',
                credentialId: biometricData.credentialId
            };
        }

        // Simulated enrollment
        const template = crypto.createHash('sha256')
            .update(scholarId + Date.now().toString())
            .digest('base64');

        return {
            success: true,
            template: template,
            type: 'simulated'
        };
    }

    async verifyBiometric(scholarId, storedTemplate, biometricData) {
        // Handle WebAuthn verification
        if (biometricData && biometricData.type === 'webauthn') {
            // In real implementation, verify the signature
            return biometricData.signature ? true : false;
        }

        // Simulated verification - 95% success rate
        return Math.random() > 0.05;
    }
}

const biometricHandler = new BiometricHandler();

// Real ZKP Manager with snarkjs
class ZKPManager {
    constructor() {
        this.circuitPath = path.join(process.cwd(), 'circuits');
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Load circuit artifacts
            this.wasmPath = path.join(this.circuitPath, 'build/biometric_auth_js/biometric_auth.wasm');
            this.zkeyPath = path.join(this.circuitPath, 'ceremony/biometric_auth_final.zkey');
            this.vKeyPath = path.join(this.circuitPath, 'ceremony/verification_key.json');

            // Check if ZKP files exist
            await fs.access(this.wasmPath);
            await fs.access(this.zkeyPath);
            await fs.access(this.vKeyPath);

            // Load verification key
            this.vKey = JSON.parse(await fs.readFile(this.vKeyPath, 'utf8'));
            this.isInitialized = true;

            if (global.ZKP_SIMULATION_MODE) {
                console.log('✅ ZKP Manager initialized in simulation mode');
            } else {
                console.log('✅ ZKP Manager initialized with real circuits');
            }
        } catch (error) {
            console.log('⚠️  ZKP circuits not found, using simulation mode');
            this.isInitialized = false;
        }
    }

    // Convert biometric data to field elements
    async biometricToFieldElements(biometricData) {
        // Hash biometric data and split into 4 field elements
        const hash = crypto.createHash('sha256').update(biometricData).digest('hex');
        const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

        const elements = [];
        for (let i = 0; i < 4; i++) {
            const chunk = hash.slice(i * 16, (i + 1) * 16);
            const value = BigInt('0x' + chunk) % fieldSize;
            elements.push(value.toString());
        }

        return elements;
    }

    // Generate commitment for storage
    async generateCommitment(biometricData, salt) {
        const elements = await this.biometricToFieldElements(biometricData);
        const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

        // Use Poseidon hash (simulated with SHA256 for now)
        const commitmentData = elements.join('') + salt;
        const hash = crypto.createHash('sha256').update(commitmentData).digest('hex');
        const commitment = BigInt('0x' + hash) % fieldSize;

        return commitment.toString();
    }

    async generateBiometricHash(biometricData, type) {
        let dataToHash;

        if (type === 'fingerprint' || type === 'webauthn') {
            dataToHash = biometricData.credentialId || biometricData;
        } else if (type === 'face') {
            dataToHash = biometricData.descriptor || biometricData;
        } else {
            dataToHash = biometricData;
        }

        const salt = crypto.randomBytes(32).toString('hex');
        const commitment = await this.generateCommitment(dataToHash, salt);

        return {
            commitment,
            salt,
            fullHash: crypto.createHash('sha256').update(dataToHash).digest('hex')
        };
    }

    async generateProof(biometricData, storedCommitment, scholarId, locationData) {
        if (!this.isInitialized) {
            // Fallback to simulation
            return this.generateSimulatedProof(biometricData, storedCommitment, scholarId);
        }

        try {
            // Load circuit files
            const circuitWasm = await fs.readFile(this.wasmPath);
            const circuitZkey = await fs.readFile(this.zkeyPath);

            // Convert inputs to field elements
            const biometricElements = await this.biometricToFieldElements(biometricData);
            const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

            // Generate salt
            const salt = crypto.randomBytes(32).toString('hex');
            const saltBigInt = BigInt('0x' + salt) % fieldSize;

            // Hash location data
            const locationHash = BigInt('0x' + crypto.createHash('sha256')
                .update(JSON.stringify(locationData))
                .digest('hex')) % fieldSize;

            // Prepare circuit inputs
            const input = {
                biometricData: biometricElements,
                salt: saltBigInt.toString(),
                storedCommitment: storedCommitment,
                scholarId: scholarId.toString(),
                timestamp: Math.floor(Date.now() / 1000).toString(),
                locationHash: locationHash.toString()
            };

            console.log('🔐 Generating ZK proof...');

            // Generate the proof
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                circuitWasm,
                circuitZkey
            );

            console.log('✅ ZK proof generated');

            return {
                proof,
                publicSignals,
                isRealProof: true
            };

        } catch (error) {
            console.error('❌ Proof generation failed:', error);
            // Fallback to simulation
            return this.generateSimulatedProof(biometricData, storedCommitment, scholarId);
        }
    }

    async generateSimulatedProof(biometricData, storedCommitment, scholarId) {
        console.log('⚠️  Using simulated proof (not cryptographically secure)');

        const proof = {
            pi_a: [
                crypto.randomBytes(32).toString('hex'),
                crypto.randomBytes(32).toString('hex')
            ],
            pi_b: [
                [
                    crypto.randomBytes(32).toString('hex'),
                    crypto.randomBytes(32).toString('hex')
                ],
                [
                    crypto.randomBytes(32).toString('hex'),
                    crypto.randomBytes(32).toString('hex')
                ]
            ],
            pi_c: [
                crypto.randomBytes(32).toString('hex'),
                crypto.randomBytes(32).toString('hex')
            ],
            protocol: "groth16",
            curve: "bn128"
        };

        const publicSignals = [
            storedCommitment,
            scholarId.toString(),
            Math.floor(Date.now() / 1000).toString(),
            crypto.randomBytes(32).toString('hex')
        ];

        return {
            proof,
            publicSignals,
            isRealProof: false
        };
    }

    async verifyProof(proof, publicSignals) {
        if (!this.isInitialized || !proof.isRealProof) {
            // Simulated verification
            return this.simulatedVerification(proof, publicSignals);
        }

        try {
            console.log('🔍 Verifying ZK proof...');
            const res = await snarkjs.groth16.verify(this.vKey, publicSignals, proof.proof);
            console.log(res ? '✅ Proof verified' : '❌ Proof verification failed');
            return res;
        } catch (error) {
            console.error('❌ Verification error:', error);
            return false;
        }
    }

    async simulatedVerification(proof, publicSignals) {
        // Simulate verification with some basic checks
        console.log('⚠️  Using simulated verification');

        // Check proof structure
        if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
            return false;
        }

        // Check public signals
        if (!publicSignals || publicSignals.length < 4) {
            return false;
        }

        // Simulate 95% success rate
        return Math.random() > 0.05;
    }

    // Store ZKP proof for audit
    async storeProof(scholarId, proof, publicSignals, purpose) {
        try {
            const zkProof = new ZKProof({
                scholarDid: `did:pramaan:${scholarId}`,
                proofHash: crypto.createHash('sha256')
                    .update(JSON.stringify(proof))
                    .digest('hex'),
                verificationKey: this.isInitialized ?
                    crypto.createHash('sha256')
                        .update(JSON.stringify(this.vKey))
                        .digest('hex')
                        .slice(0, 16) : 'simulated',
                timestamp: new Date(),
                status: 'verified',
                purpose: purpose,
                publicSignals: publicSignals,
                isRealProof: proof.isRealProof || false
            });

            await zkProof.save();
            return zkProof;
        } catch (error) {
            console.error('Failed to store ZKP proof:', error);
            return null;
        }
    }

    generateDID(scholarId, biometricCommitment) {
        const combined = scholarId + biometricCommitment;
        const did = crypto.createHash('sha256')
            .update(combined)
            .digest('hex');
        return `did:pramaan:${did.slice(0, 16)}`;
    }
}

const zkpManager = new ZKPManager();

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Biometric template encryption/decryption helpers
async function encryptBiometricTemplate(template, scholarId) {
    // In production, use proper encryption with key management
    const cipher = crypto.createCipher('aes-256-cbc', process.env.BIOMETRIC_KEY || 'default-key');
    let encrypted = cipher.update(template, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

async function decryptBiometricTemplate(encryptedTemplate, scholarId) {
    if (encryptedTemplate === 'simulated') return 'simulated';

    const decipher = crypto.createDecipher('aes-256-cbc', process.env.BIOMETRIC_KEY || 'default-key');
    let decrypted = decipher.update(encryptedTemplate, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Routes

// Admin Routes
app.post('/api/admin/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new Admin({
            username,
            password: hashedPassword,
            email,
            permissions: ['read', 'write', 'delete', 'manage_scholars']
        });

        await admin.save();
        res.json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        admin.lastLogin = new Date();
        await admin.save();

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            admin: {
                username: admin.username,
                email: admin.email,
                permissions: admin.permissions,
                campusLocation: admin.campusLocation
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update campus location settings
app.put('/api/admin/campus-location', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { latitude, longitude, radius } = req.body;

        const admin = await Admin.findById(req.user.id);
        admin.campusLocation = { latitude, longitude, radius };
        await admin.save();

        res.json({
            message: 'Campus location updated successfully',
            campusLocation: admin.campusLocation
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Biometric Routes

// WebAuthn Registration - Step 1: Generate options
app.post('/api/biometric/register/fingerprint/options', authenticateToken, async (req, res) => {
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

        // Store challenge in session
        req.session.challenge = options.challenge;

        res.json(options);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebAuthn Registration - Step 2: Verify response
app.post('/api/biometric/register/fingerprint/verify', authenticateToken, async (req, res) => {
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
        const biometricHash = await zkpManager.generateBiometricHash(
            credential.id + verification.registrationInfo.credentialPublicKey,
            'webauthn'
        );

        const did = zkpManager.generateDID(req.user.scholarId, biometricHash.commitment);

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
            hashDID: {
                part1: biometricHash.commitment.slice(0, 32),
                part2: biometricHash.commitment.slice(32, 64)
            },
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
                biometricType: 'webauthn',
                webAuthnCredentials: [{
                    credentialId: credential.id,
                    publicKey: verification.registrationInfo.credentialPublicKey,
                    counter: verification.registrationInfo.counter
                }],
                biometricCommitment: biometricHash.commitment,
                biometricSalt: biometricHash.salt
            }
        );

        res.json({
            success: true,
            message: 'Fingerprint registered successfully',
            did: did
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Face Registration
app.post('/api/biometric/register/face', authenticateToken, async (req, res) => {
    try {
        const { faceDescriptor } = req.body;
        const scholarId = req.body.scholarId || req.user.scholarId;

        if (!faceDescriptor) {
            return res.status(400).json({ error: 'Face descriptor required' });
        }

        // Generate hash from face descriptor
        const biometricHash = await zkpManager.generateBiometricHash(faceDescriptor, 'face');
        const did = zkpManager.generateDID(req.user.scholarId, biometricHash.commitment);

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
            hashDID: {
                part1: biometricHash.commitment.slice(0, 32),
                part2: biometricHash.commitment.slice(32, 64)
            }
        });

        await biometricData.save();

        // Update scholar
        await Scholar.findOneAndUpdate(
            { scholarId: req.user.scholarId },
            {
                biometricType: 'face',
                biometricCommitment: biometricHash.commitment,
                biometricSalt: biometricHash.salt
            }
        );

        res.json({
            success: true,
            message: 'Face registered successfully',
            did: did
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebAuthn Authentication - Step 1: Generate options
app.post('/api/biometric/auth/fingerprint/options', async (req, res) => {
    try {
        const { scholarId } = req.body;

        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar || !scholar.webAuthnCredentials || scholar.webAuthnCredentials.length === 0) {
            return res.status(404).json({ error: 'No registered credentials found' });
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: scholar.webAuthnCredentials.map(cred => ({
                id: cred.credentialId,
                type: 'public-key',
                transports: ['internal']
            })),
            userVerification: 'required'
        });

        req.session.challenge = options.challenge;
        req.session.scholarId = scholarId;

        res.json(options);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebAuthn Authentication - Step 2: Verify response
app.post('/api/biometric/auth/fingerprint/verify', async (req, res) => {
    try {
        const { credential } = req.body;
        const expectedChallenge = req.session.challenge;
        const scholarId = req.session.scholarId;

        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }

        const credentialRecord = scholar.webAuthnCredentials.find(
            cred => cred.credentialId === credential.id
        );

        if (!credentialRecord) {
            return res.status(400).json({ error: 'Credential not found' });
        }

        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: credentialRecord.credentialId,
                credentialPublicKey: credentialRecord.publicKey,
                counter: credentialRecord.counter
            }
        });

        if (!verification.verified) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        // Update counter
        credentialRecord.counter = verification.authenticationInfo.newCounter;
        await scholar.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                id: scholar._id,
                scholarId: scholar.scholarId,
                role: 'scholar'
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            success: true,
            token,
            scholar: {
                scholarId: scholar.scholarId,
                name: scholar.name,
                department: scholar.department,
                did: scholar.did
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scholar Registration with Biometric Support
app.post('/api/scholar/login', async (req, res) => {
    try {
        const { scholarId, biometricData, biometricType } = req.body;

        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }

        // Verify biometric
        let verificationResult = false;

        if (scholar.biometricType !== 'simulated' && biometricType === 'real') {
            const decryptedTemplate = await decryptBiometricTemplate(
                scholar.biometricTemplate,
                scholarId
            );
            verificationResult = await biometricHandler.verifyBiometric(
                scholarId,
                decryptedTemplate,
                biometricData
            );
        } else {
            // Simulated verification
            verificationResult = true;
        }

        if (!verificationResult) {
            return res.status(401).json({ error: 'Biometric verification failed' });
        }

        // Generate ZK proof
        const proof = await zkpManager.generateProof(
            biometricData.signature || biometricData.descriptor || biometricData.data || biometricData,
            scholar.biometricCommitment,
            scholarId,
            { type: 'login', timestamp: Date.now() }
        );

        const isValid = await zkpManager.verifyProof(proof, proof.publicSignals);
        if (!isValid) {
            return res.status(401).json({ error: 'ZKP verification failed' });
        }

        const token = jwt.sign(
            { id: scholar._id, scholarId: scholar.scholarId, role: 'scholar' },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            scholar: {
                scholarId: scholar.scholarId,
                name: scholar.name,
                department: scholar.department,
                did: scholar.did
            },
            biometricType: scholar.biometricType,
            zkpType: proof.isRealProof ? 'Real ZKP' : 'Simulated'
        });
    } catch (error) {
        console.error('Scholar login error:', error);
        res.status(500).json({ error: error.message || 'Login failed' });
    }
});

// Attendance Check-in/Check-out with Real ZKP and Location Verification
app.post('/api/attendance/mark', async (req, res) => {
    try {
        const { scholarId, biometricData, location, biometricType } = req.body;

        // Find scholar
        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }

        // Get admin campus location settings
        const admin = await Admin.findOne({});
        const campusLocation = admin?.campusLocation || {
            latitude: 25.26,
            longitude: 82.99,
            radius: 500
        };

        // Verify location if provided
        if (location && location.coordinates) {
            const distance = calculateDistance(
                location.coordinates.latitude,
                location.coordinates.longitude,
                campusLocation.latitude,
                campusLocation.longitude
            );

            if (distance > campusLocation.radius) {
                return res.status(403).json({
                    error: 'Not within campus boundaries',
                    distance: Math.round(distance),
                    maxDistance: campusLocation.radius
                });
            }
        }

        let biometricFeatures;
        let verificationResult = false;

        // Handle real biometric verification
        if (scholar.biometricType !== 'simulated' && biometricType === 'real') {
            const decryptedTemplate = await decryptBiometricTemplate(
                scholar.biometricTemplate,
                scholarId
            );
            verificationResult = await biometricHandler.verifyBiometric(
                scholarId,
                decryptedTemplate,
                biometricData
            );

            if (!verificationResult) {
                return res.status(401).json({ error: 'Biometric verification failed' });
            }

            biometricFeatures = biometricData.signature || biometricData.data || biometricData;
        } else {
            // Simulated verification
            biometricFeatures = biometricData;
            verificationResult = true;
        }

        // Generate ZK proof
        const proof = await zkpManager.generateProof(
            biometricFeatures,
            scholar.biometricCommitment,
            scholarId,
            location || { name: 'Main Campus' }
        );

        // Verify the proof
        const isValid = await zkpManager.verifyProof(proof, proof.publicSignals);
        if (!isValid) {
            return res.status(401).json({ error: 'ZKP verification failed' });
        }

        // Check for existing attendance today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            scholarId,
            checkIn: { $gte: today }
        });

        if (existingAttendance && !existingAttendance.checkOut) {
            // Check-out
            existingAttendance.checkOut = new Date();
            existingAttendance.duration =
                (existingAttendance.checkOut - existingAttendance.checkIn) / (1000 * 60 * 60);

            await existingAttendance.save();

            res.json({
                message: 'Checked out successfully',
                checkOut: existingAttendance.checkOut,
                duration: existingAttendance.duration.toFixed(2) + ' hours',
                biometricType: scholar.biometricType,
                zkpType: proof.isRealProof ? 'Real ZKP' : 'Simulated'
            });
        } else if (existingAttendance && existingAttendance.checkOut) {
            res.status(400).json({ error: 'Already checked out for today' });
        } else {
            // Check-in
            const attendance = new Attendance({
                scholarId,
                did: scholar.did,
                checkIn: new Date(),
                location: location || { name: 'Main Campus' },
                zkProof: {
                    proof: proof.proof,
                    publicSignals: proof.publicSignals,
                    verificationKey: scholar.zkpPublicKey,
                    isRealProof: proof.isRealProof
                },
                verified: true,
                biometricType: scholar.biometricType
            });

            await attendance.save();

            // Store the proof for audit
            await zkpManager.storeProof(scholarId, proof, proof.publicSignals, 'attendance');

            res.json({
                message: 'Checked in successfully',
                checkIn: attendance.checkIn,
                location: attendance.location.name,
                biometricType: scholar.biometricType,
                zkpType: proof.isRealProof ? 'Real ZKP' : 'Simulated'
            });
        }
    } catch (error) {
        console.error('Attendance marking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get scholar's biometric type
app.get('/api/scholar/:scholarId/biometric-type', async (req, res) => {
    try {
        const scholar = await Scholar.findOne({
            scholarId: req.params.scholarId
        }).select('biometricType webAuthnCredentials');

        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }

        res.json({
            biometricType: scholar.biometricType,
            hasWebAuthn: scholar.webAuthnCredentials && scholar.webAuthnCredentials.length > 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Dashboard Routes
app.get('/api/admin/dashboard', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const totalScholars = await Scholar.countDocuments({ status: 'active' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayAttendance = await Attendance.find({
            checkIn: { $gte: today }
        });

        const presentToday = new Set(todayAttendance.map(a => a.scholarId)).size;
        const checkedOut = todayAttendance.filter(a => a.checkOut).length;
        const stillPresent = presentToday - checkedOut;

        // Calculate average hours
        let totalHours = 0;
        let completedSessions = 0;

        todayAttendance.forEach(attendance => {
            if (attendance.duration > 0) {
                totalHours += attendance.duration;
                completedSessions++;
            }
        });

        const avgHours = completedSessions > 0 ?
            (totalHours / completedSessions).toFixed(2) : 0;

        // Department-wise statistics
        const deptStats = await Scholar.aggregate([
            {
                $group: {
                    _id: '$department',
                    count: { $sum: 1 }
                }
            }
        ]);

        // ZKP statistics
        const zkpStats = await ZKProof.aggregate([
            {
                $match: {
                    timestamp: { $gte: today }
                }
            },
            {
                $group: {
                    _id: '$isRealProof',
                    count: { $sum: 1 }
                }
            }
        ]);

        const realZKPCount = zkpStats.find(s => s._id === true)?.count || 0;
        const simulatedZKPCount = zkpStats.find(s => s._id === false)?.count || 0;

        // Biometric type statistics
        const biometricStats = await Scholar.aggregate([
            {
                $group: {
                    _id: '$biometricType',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            totalScholars,
            presentToday,
            stillPresent,
            avgHours,
            departmentStats: deptStats,
            zkpStats: {
                real: realZKPCount,
                simulated: simulatedZKPCount,
                enabled: zkpManager.isInitialized
            },
            biometricStats: biometricStats,
            recentAttendance: todayAttendance.slice(-10)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/scholars', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { department, search, page = 1, limit = 20 } = req.query;

        let query = {};
        if (department) query.department = department;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { scholarId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const scholars = await Scholar.find(query)
            .select('-biometricCommitment -biometricSalt -biometricTemplate -webAuthnCredentials')
            .sort({ registeredAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Scholar.countDocuments(query);

        res.json({
            scholars,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/attendance', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { date, scholarId, department, page = 1, limit = 50 } = req.query;

        let query = {};

        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);

            query.checkIn = {
                $gte: searchDate,
                $lt: nextDay
            };
        }

        if (scholarId) query.scholarId = scholarId;

        let attendance = await Attendance.find(query)
            .sort({ checkIn: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        // If department filter is applied, we need to join with scholars
        if (department) {
            const scholars = await Scholar.find({ department }).select('scholarId');
            const scholarIds = scholars.map(s => s.scholarId);
            attendance = attendance.filter(a => scholarIds.includes(a.scholarId));
        }

        // Enrich attendance data with scholar info
        const scholarIds = [...new Set(attendance.map(a => a.scholarId))];
        const scholars = await Scholar.find({
            scholarId: { $in: scholarIds }
        }).select('scholarId name department biometricType');

        const scholarMap = {};
        scholars.forEach(s => {
            scholarMap[s.scholarId] = s;
        });

        const enrichedAttendance = attendance.map(a => ({
            ...a,
            scholarName: scholarMap[a.scholarId]?.name || 'Unknown',
            department: scholarMap[a.scholarId]?.department || 'Unknown',
            biometricType: scholarMap[a.scholarId]?.biometricType || 'Unknown',
            zkpType: a.zkProof?.isRealProof ? 'Real ZKP' : 'Simulated'
        }));

        const total = await Attendance.countDocuments(query);

        res.json({
            attendance: enrichedAttendance,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/reports', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { startDate, endDate, type = 'summary' } = req.query;

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (type === 'summary') {
            // Department-wise attendance summary
            const attendance = await Attendance.find({
                checkIn: { $gte: start, $lte: end }
            });

            const scholars = await Scholar.find({});
            const scholarMap = {};
            scholars.forEach(s => {
                scholarMap[s.scholarId] = {
                    department: s.department,
                    biometricType: s.biometricType
                };
            });

            const deptSummary = {};
            attendance.forEach(a => {
                const scholarInfo = scholarMap[a.scholarId];
                const dept = scholarInfo?.department || 'Unknown';

                if (!deptSummary[dept]) {
                    deptSummary[dept] = {
                        totalSessions: 0,
                        totalHours: 0,
                        uniqueScholars: new Set(),
                        realZKPCount: 0,
                        simulatedZKPCount: 0,
                        biometricTypes: {}
                    };
                }

                deptSummary[dept].totalSessions++;
                deptSummary[dept].totalHours += a.duration || 0;
                deptSummary[dept].uniqueScholars.add(a.scholarId);

                if (a.zkProof?.isRealProof) {
                    deptSummary[dept].realZKPCount++;
                } else {
                    deptSummary[dept].simulatedZKPCount++;
                }

                // Count biometric types
                const bioType = scholarInfo?.biometricType || 'unknown';
                deptSummary[dept].biometricTypes[bioType] =
                    (deptSummary[dept].biometricTypes[bioType] || 0) + 1;
            });

            const summary = Object.entries(deptSummary).map(([dept, data]) => ({
                department: dept,
                totalSessions: data.totalSessions,
                totalHours: data.totalHours.toFixed(2),
                uniqueScholars: data.uniqueScholars.size,
                avgHoursPerSession: (data.totalHours / data.totalSessions).toFixed(2),
                zkpStats: {
                    real: data.realZKPCount,
                    simulated: data.simulatedZKPCount
                },
                biometricTypes: data.biometricTypes
            }));

            res.json({ summary });
        } else if (type === 'detailed') {
            // Detailed scholar-wise report
            const attendance = await Attendance.find({
                checkIn: { $gte: start, $lte: end }
            }).sort({ scholarId: 1, checkIn: 1 });

            const scholarStats = {};
            attendance.forEach(a => {
                if (!scholarStats[a.scholarId]) {
                    scholarStats[a.scholarId] = {
                        totalDays: 0,
                        totalHours: 0,
                        sessions: [],
                        realZKPCount: 0,
                        simulatedZKPCount: 0
                    };
                }

                scholarStats[a.scholarId].totalDays++;
                scholarStats[a.scholarId].totalHours += a.duration || 0;
                scholarStats[a.scholarId].sessions.push({
                    date: a.checkIn,
                    duration: a.duration || 0,
                    zkpType: a.zkProof?.isRealProof ? 'Real' : 'Simulated',
                    biometricType: a.biometricType
                });

                if (a.zkProof?.isRealProof) {
                    scholarStats[a.scholarId].realZKPCount++;
                } else {
                    scholarStats[a.scholarId].simulatedZKPCount++;
                }
            });

            res.json({ scholarStats });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Biometric device status
app.get('/api/biometric/status', (req, res) => {
    const status = {
        initialized: true,
        deviceType: biometricHandler.deviceType,
        ready: true,
        supportedTypes: ['webauthn', 'fingerprint', 'face', 'simulated']
    };
    res.json(status);
});

// ZKP Status and Logs
app.get('/api/admin/zkp-status', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const zkpLogs = await ZKProof.find({})
            .sort({ timestamp: -1 })
            .limit(100)
            .select('scholarDid timestamp purpose status isRealProof');

        const stats = await ZKProof.aggregate([
            {
                $group: {
                    _id: {
                        purpose: '$purpose',
                        isRealProof: '$isRealProof'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            status: {
                enabled: zkpManager.isInitialized,
                type: zkpManager.isInitialized ? 'Real ZKP (snarkjs)' : 'Simulated',
                circuitPath: zkpManager.circuitPath
            },
            stats,
            recentLogs: zkpLogs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scholar Routes (for mobile app or kiosk)
app.post('/api/scholar/login', async (req, res) => {
    try {
        const { scholarId, biometricData, biometricType } = req.body;

        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }

        // Verify biometric
        let verificationResult = false;

        if (scholar.biometricType !== 'simulated' && biometricType === 'real') {
            const decryptedTemplate = await decryptBiometricTemplate(
                scholar.biometricTemplate,
                scholarId
            );
            verificationResult = await biometricHandler.verifyBiometric(
                scholarId,
                decryptedTemplate,
                biometricData
            );
        } else {
            // Simulated verification
            verificationResult = true;
        }

        if (!verificationResult) {
            return res.status(401).json({ error: 'Biometric verification failed' });
        }

        // Generate ZK proof
        const proof = await zkpManager.generateProof(
            biometricData.signature || biometricData.data || biometricData,
            scholar.biometricCommitment,
            scholarId,
            { type: 'login', timestamp: Date.now() }
        );

        const isValid = await zkpManager.verifyProof(proof, proof.publicSignals);
        if (!isValid) {
            return res.status(401).json({ error: 'ZKP verification failed' });
        }

        const token = jwt.sign(
            { id: scholar._id, scholarId: scholar.scholarId, role: 'scholar' },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            scholar: {
                scholarId: scholar.scholarId,
                name: scholar.name,
                department: scholar.department,
                did: scholar.did
            },
            biometricType: scholar.biometricType,
            zkpType: proof.isRealProof ? 'Real ZKP' : 'Simulated'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/scholar/attendance-history', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'scholar') {
            return res.status(403).json({ error: 'Scholar access required' });
        }

        const attendance = await Attendance.find({
            scholarId: req.user.scholarId
        }).sort({ checkIn: -1 }).limit(30);

        const enrichedAttendance = attendance.map(a => ({
            ...a.toObject(),
            zkpType: a.zkProof?.isRealProof ? 'Real ZKP' : 'Simulated'
        }));

        res.json({ attendance: enrichedAttendance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        zkp: {
            enabled: zkpManager.isInitialized,
            type: zkpManager.isInitialized ? 'Real (snarkjs + Groth16)' : 'Simulated'
        },
        biometric: {
            type: biometricHandler.deviceType,
            ready: true,
            supportedTypes: ['webauthn', 'fingerprint', 'face', 'simulated']
        },
        dbConnected: mongoose.connection.readyState === 1
    });
});

// Initialize default admin if none exists
async function initializeAdmin() {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
        const defaultAdmin = new Admin({
            username: 'admin',
            password: await bcrypt.hash('admin123', 10),
            email: 'admin@pramaan.edu',
            permissions: ['read', 'write', 'delete', 'manage_scholars'],
            campusLocation: {
                latitude: 25.26,
                longitude: 82.99,
                radius: 500
            }
        });
        await defaultAdmin.save();
        console.log('Default admin created - Username: admin, Password: admin123');
    }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`\n🚀 Pramaan Backend Server running on port ${PORT}`);
    console.log('🔐 ZKP Integration:', zkpManager.isInitialized ?
        'Real ZKP with snarkjs (Groth16)' :
        'Simulated (Run "npm run setup-zkp" for real ZKP)');
    console.log('👆 Biometric Support:', biometricHandler.deviceType);
    console.log('🔒 WebAuthn Support: Enabled');
    console.log('🗄️  MongoDB:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');

    // Initialize admin
    await initializeAdmin();

    if (!zkpManager.isInitialized) {
        console.log('\n⚠️  To enable real ZKP:');
        console.log('1. Run: npm install');
        console.log('2. Run: npm run setup-zkp');
        console.log('3. Restart the server');
    }
});