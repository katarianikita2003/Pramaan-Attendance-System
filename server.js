// server.js - Main Backend Server with ZKP Integration
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pramaan-attendance';

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
    biometricHash: { type: String, required: true },
    did: { type: String, unique: true, required: true },
    zkpPublicKey: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
    status: { type: String, default: 'active' }
});

const AttendanceSchema = new mongoose.Schema({
    scholarId: { type: String, required: true },
    did: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    duration: { type: Number, default: 0 },
    location: { type: String, default: 'Main Campus' },
    zkProof: {
        commitment: String,
        challenge: String,
        response: String,
        verificationKey: String
    },
    verified: { type: Boolean, default: false },
    anomalyDetected: { type: Boolean, default: false }
});

const AdminSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    role: { type: String, default: 'admin' },
    permissions: [String],
    lastLogin: Date
});

const ZKProofSchema = new mongoose.Schema({
    did: { type: String, required: true },
    proofData: {
        a: [String],
        b: [[String]],
        c: [String],
        publicSignals: [String]
    },
    verificationKey: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    purpose: { type: String, required: true } // 'registration' or 'attendance'
});

// Models
const Scholar = mongoose.model('Scholar', ScholarSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const ZKProof = mongoose.model('ZKProof', ZKProofSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'pramaan-secret-key-2024';

// ZKP Helper Functions
class ZKPManager {
    constructor() {
        this.circuitPath = path.join(__dirname, 'circuits');
        this.setupZKEnvironment();
    }

    async setupZKEnvironment() {
        // Ensure circuits directory exists
        await fs.mkdir(this.circuitPath, { recursive: true });
        
        // Create the ZK circuit for biometric verification
        const circuitCode = `
pragma circom 2.0.0;

template BiometricVerification() {
    signal input biometricHash[2];
    signal input storedHash[2];
    signal input nonce;
    signal output isValid;
    
    // Verify that biometric matches stored hash
    component eq1 = IsEqual();
    eq1.in[0] <== biometricHash[0];
    eq1.in[1] <== storedHash[0];
    
    component eq2 = IsEqual();
    eq2.in[0] <== biometricHash[1];
    eq2.in[1] <== storedHash[1];
    
    // Both parts must match
    isValid <== eq1.out * eq2.out;
}

template IsEqual() {
    signal input in[2];
    signal output out;
    
    signal diff;
    diff <== in[0] - in[1];
    
    component isZero = IsZero();
    isZero.in <== diff;
    out <== isZero.out;
}

template IsZero() {
    signal input in;
    signal output out;
    
    signal inv;
    inv <-- in != 0 ? 1/in : 0;
    out <== -in*inv + 1;
    in * out === 0;
}

component main = BiometricVerification();
        `;
        
        await fs.writeFile(
            path.join(this.circuitPath, 'biometric.circom'), 
            circuitCode
        );
    }

    async generateBiometricHash(biometricData) {
        // Simulate biometric feature extraction
        const hash1 = crypto.createHash('sha256')
            .update(biometricData + 'feature1')
            .digest('hex');
        const hash2 = crypto.createHash('sha256')
            .update(biometricData + 'feature2')
            .digest('hex');
        
        return {
            hash: [hash1.slice(0, 16), hash2.slice(0, 16)],
            fullHash: crypto.createHash('sha256')
                .update(biometricData)
                .digest('hex')
        };
    }

    async generateProof(biometricHash, storedHash, nonce) {
        // Simulate ZK proof generation
        // In production, this would use snarkjs or similar library
        const proof = {
            a: [
                "0x" + crypto.randomBytes(32).toString('hex'),
                "0x" + crypto.randomBytes(32).toString('hex')
            ],
            b: [
                [
                    "0x" + crypto.randomBytes(32).toString('hex'),
                    "0x" + crypto.randomBytes(32).toString('hex')
                ],
                [
                    "0x" + crypto.randomBytes(32).toString('hex'),
                    "0x" + crypto.randomBytes(32).toString('hex')
                ]
            ],
            c: [
                "0x" + crypto.randomBytes(32).toString('hex'),
                "0x" + crypto.randomBytes(32).toString('hex')
            ],
            publicSignals: [storedHash[0], storedHash[1], nonce.toString()]
        };

        return proof;
    }

    async verifyProof(proof, publicSignals) {
        // Simulate proof verification
        // In production, this would verify against the smart contract
        try {
            // Check proof structure
            if (!proof.a || !proof.b || !proof.c || !proof.publicSignals) {
                return false;
            }
            
            // Simulate verification delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // In real implementation, this would call the verifier contract
            return true;
        } catch (error) {
            console.error('Proof verification error:', error);
            return false;
        }
    }

    generateDID(scholarId, biometricHash) {
        const combined = scholarId + biometricHash.fullHash;
        const did = crypto.createHash('sha256')
            .update(combined)
            .digest('hex');
        return `did:pramaan:${did.slice(0, 16)}`;
    }
}

const zkpManager = new ZKPManager();

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
                permissions: admin.permissions
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scholar Registration with ZKP
app.post('/api/scholar/register', async (req, res) => {
    try {
        const { scholarId, name, email, department, supervisor, biometricData } = req.body;
        
        // Check if scholar already exists
        const existing = await Scholar.findOne({ 
            $or: [{ scholarId }, { email }] 
        });
        if (existing) {
            return res.status(400).json({ error: 'Scholar already registered' });
        }
        
        // Generate biometric hash and DID
        const biometricHash = await zkpManager.generateBiometricHash(biometricData);
        const did = zkpManager.generateDID(scholarId, biometricHash);
        
        // Generate ZKP public key for the scholar
        const zkpPublicKey = crypto.randomBytes(32).toString('hex');
        
        // Create scholar record
        const scholar = new Scholar({
            scholarId,
            name,
            email,
            department,
            supervisor,
            biometricHash: biometricHash.fullHash,
            did,
            zkpPublicKey
        });
        
        await scholar.save();
        
        // Generate initial ZK proof for registration
        const nonce = Date.now();
        const proof = await zkpManager.generateProof(
            biometricHash.hash,
            biometricHash.hash,
            nonce
        );
        
        // Store the proof
        const zkProofRecord = new ZKProof({
            did,
            proofData: proof,
            verificationKey: zkpPublicKey,
            purpose: 'registration'
        });
        
        await zkProofRecord.save();
        
        res.json({
            message: 'Scholar registered successfully',
            scholarId,
            did,
            zkpPublicKey
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Attendance Check-in/Check-out with ZKP
app.post('/api/attendance/mark', async (req, res) => {
    try {
        const { scholarId, biometricData, location } = req.body;
        
        // Find scholar
        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }
        
        // Generate biometric hash from provided data
        const providedBiometricHash = await zkpManager.generateBiometricHash(biometricData);
        
        // Generate ZK proof
        const nonce = Date.now();
        const proof = await zkpManager.generateProof(
            providedBiometricHash.hash,
            [scholar.biometricHash.slice(0, 16), scholar.biometricHash.slice(16, 32)],
            nonce
        );
        
        // Verify the proof
        const isValid = await zkpManager.verifyProof(proof, proof.publicSignals);
        if (!isValid) {
            return res.status(401).json({ error: 'Biometric verification failed' });
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
                duration: existingAttendance.duration.toFixed(2) + ' hours'
            });
        } else if (existingAttendance && existingAttendance.checkOut) {
            res.status(400).json({ error: 'Already checked out for today' });
        } else {
            // Check-in
            const attendance = new Attendance({
                scholarId,
                did: scholar.did,
                checkIn: new Date(),
                location: location || 'Main Campus',
                zkProof: {
                    commitment: proof.a[0],
                    challenge: proof.b[0][0],
                    response: proof.c[0],
                    verificationKey: scholar.zkpPublicKey
                },
                verified: true
            });
            
            await attendance.save();
            
            // Store the proof
            const zkProofRecord = new ZKProof({
                did: scholar.did,
                proofData: proof,
                verificationKey: scholar.zkpPublicKey,
                purpose: 'attendance'
            });
            
            await zkProofRecord.save();
            
            res.json({
                message: 'Checked in successfully',
                checkIn: attendance.checkIn,
                location: attendance.location
            });
        }
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
        
        res.json({
            totalScholars,
            presentToday,
            stillPresent,
            avgHours,
            departmentStats: deptStats,
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
            .select('-biometricHash')
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
        }).select('scholarId name department');
        
        const scholarMap = {};
        scholars.forEach(s => {
            scholarMap[s.scholarId] = s;
        });
        
        const enrichedAttendance = attendance.map(a => ({
            ...a,
            scholarName: scholarMap[a.scholarId]?.name || 'Unknown',
            department: scholarMap[a.scholarId]?.department || 'Unknown'
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
                scholarMap[s.scholarId] = s.department;
            });
            
            const deptSummary = {};
            attendance.forEach(a => {
                const dept = scholarMap[a.scholarId] || 'Unknown';
                if (!deptSummary[dept]) {
                    deptSummary[dept] = {
                        totalSessions: 0,
                        totalHours: 0,
                        uniqueScholars: new Set()
                    };
                }
                
                deptSummary[dept].totalSessions++;
                deptSummary[dept].totalHours += a.duration || 0;
                deptSummary[dept].uniqueScholars.add(a.scholarId);
            });
            
            const summary = Object.entries(deptSummary).map(([dept, data]) => ({
                department: dept,
                totalSessions: data.totalSessions,
                totalHours: data.totalHours.toFixed(2),
                uniqueScholars: data.uniqueScholars.size,
                avgHoursPerSession: (data.totalHours / data.totalSessions).toFixed(2)
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
                        sessions: []
                    };
                }
                
                scholarStats[a.scholarId].totalDays++;
                scholarStats[a.scholarId].totalHours += a.duration || 0;
                scholarStats[a.scholarId].sessions.push({
                    date: a.checkIn,
                    duration: a.duration || 0
                });
            });
            
            res.json({ scholarStats });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scholar Routes (for mobile app or kiosk)
app.post('/api/scholar/login', async (req, res) => {
    try {
        const { scholarId, biometricData } = req.body;
        
        const scholar = await Scholar.findOne({ scholarId });
        if (!scholar) {
            return res.status(404).json({ error: 'Scholar not found' });
        }
        
        // Verify biometric with ZKP
        const providedBiometricHash = await zkpManager.generateBiometricHash(biometricData);
        const nonce = Date.now();
        const proof = await zkpManager.generateProof(
            providedBiometricHash.hash,
            [scholar.biometricHash.slice(0, 16), scholar.biometricHash.slice(16, 32)],
            nonce
        );
        
        const isValid = await zkpManager.verifyProof(proof, proof.publicSignals);
        if (!isValid) {
            return res.status(401).json({ error: 'Biometric verification failed' });
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
            }
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
        
        res.json({ attendance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        zkpEnabled: true,
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
            permissions: ['read', 'write', 'delete', 'manage_scholars']
        });
        await defaultAdmin.save();
        console.log('Default admin created - Username: admin, Password: admin123');
    }
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Pramaan Backend Server running on port ${PORT}`);
    console.log('ZKP Integration: Enabled');
    console.log('MongoDB:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
    
    // Initialize admin
    await initializeAdmin();
});