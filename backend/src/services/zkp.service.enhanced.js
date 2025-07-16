// backend/src/services/zkp.service.enhanced.js
import crypto from 'crypto';
import logger from '../utils/logger.js';

class EnhancedZKPService {
  constructor() {
    this.isSimulationMode = process.env.ZKP_MODE === 'simulation' || process.env.NODE_ENV === 'development';
    this.keys = null;
    
    if (this.isSimulationMode) {
      logger.info('Enhanced ZKP Service initialized in simulation mode');
      this.initializeSimulationKeys();
    } else {
      logger.info('Enhanced ZKP Service initialized in production mode');
      this.loadProductionKeys();
    }
  }

  /**
   * Initialize mock keys for simulation mode
   */
  initializeSimulationKeys() {
    this.keys = {
      provingKey: 'mock_proving_key_' + crypto.randomBytes(16).toString('hex'),
      verificationKey: 'mock_verification_key_' + crypto.randomBytes(16).toString('hex'),
      protocol: 'groth16'
    };
  }

  /**
   * Load production ZKP keys
   */
  async loadProductionKeys() {
    try {
      // TODO: Load actual proving and verification keys
      // This would typically load from files or secure storage
      throw new Error('Production keys not configured');
    } catch (error) {
      logger.error('Failed to load production keys, falling back to simulation mode', error);
      this.isSimulationMode = true;
      this.initializeSimulationKeys();
    }
  }

  /**
   * Generate a biometric commitment
   */
  async generateBiometricCommitment(biometricData, salt = null) {
    try {
      const actualSalt = salt || crypto.randomBytes(32).toString('hex');
      const dataToHash = `${JSON.stringify(biometricData)}_${actualSalt}`;
      
      const commitment = crypto
        .createHash('sha256')
        .update(dataToHash)
        .digest('hex');

      return {
        commitment,
        salt: actualSalt,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  /**
   * Verify a biometric commitment
   */
  verifyBiometricCommitment(biometricData, commitment, salt) {
    try {
      const regenerated = this.generateBiometricCommitmentSync(biometricData, salt);
      return regenerated === commitment;
    } catch (error) {
      logger.error('Error verifying biometric commitment:', error);
      return false;
    }
  }

  /**
   * Generate sync version for verification
   */
  generateBiometricCommitmentSync(biometricData, salt) {
    const dataToHash = `${JSON.stringify(biometricData)}_${salt}`;
    return crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex');
  }

  /**
   * Generate a biometric proof
   */
  async generateBiometricProof(biometricData, commitment) {
    try {
      if (this.isSimulationMode) {
        // Simulation: Generate mock proof
        const proof = {
          pi_a: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
          pi_b: [[crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')], 
                 [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')]],
          pi_c: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
          protocol: "groth16"
        };

        const nullifier = this.generateNullifier(biometricData);

        return {
          proof: JSON.stringify(proof),
          nullifier,
          commitment,
          publicSignals: [commitment, nullifier],
          verified: true
        };
      } else {
        // Production: Use actual ZKP library
        // This would involve actual circuit execution
        throw new Error('Production biometric proof not implemented');
      }
    } catch (error) {
      logger.error('Error generating biometric proof:', error);
      throw error;
    }
  }

  /**
   * Generate nullifier from biometric data
   */
  generateNullifier(biometricData) {
    const data = typeof biometricData === 'string' ? biometricData : JSON.stringify(biometricData);
    return crypto
      .createHash('sha256')
      .update(`nullifier_${data}`)
      .digest('hex');
  }

  /**
   * Hash data to field element
   */
  hashToField(data) {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return hash;
  }

  /**
   * Generate location proof
   */
  async generateLocationProof(userLocation, targetLocation) {
    try {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        targetLocation.coordinates[1], // lat
        targetLocation.coordinates[0]  // lng
      );

      const isWithinRange = distance <= (targetLocation.radius || 100); // 100m default

      if (this.isSimulationMode) {
        return {
          proof: crypto.randomBytes(32).toString('hex'),
          distance: Math.round(distance),
          isValid: isWithinRange,
          timestamp: Date.now()
        };
      }

      // Production implementation would go here
      throw new Error('Production location proof not implemented');
    } catch (error) {
      logger.error('Error generating location proof:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
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

  /**
   * Generate attendance proof
   */
  async generateAttendanceProof(scholarId, biometricProof, timestamp) {
    try {
      const proofId = crypto.randomBytes(16).toString('hex');
      
      if (this.isSimulationMode) {
        // Simulation: Generate structured proof
        const zkProof = {
          pi_a: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
          pi_b: [[crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')], 
                 [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')]],
          pi_c: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
          protocol: "groth16"
        };

        const attendanceProof = {
          proofId,
          proof: JSON.stringify(zkProof), // Serialized proof
          publicInputs: {
            scholarId,
            timestamp,
            biometricHash: this.hashToField(biometricProof)
          },
          verificationKey: this.keys.verificationKey,
          protocol: 'groth16',
          nonce: crypto.randomBytes(8).toString('hex')
        };
        
        return attendanceProof;
      } else {
        // Production: Generate actual ZKP using snarkjs
        throw new Error('Production attendance proof not implemented');
      }
    } catch (error) {
      logger.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  /**
   * Generate QR code data for attendance proof - COMPACT VERSION
   */
  async generateAttendanceQR(attendanceData) {
    try {
      const { proofId, scholarId, organizationId, timestamp, attendanceType, locationValid } = attendanceData;
      
      // Generate a very compact proof for QR code
      const qrProof = {
        i: proofId.substring(0, 8), // Short proof ID (8 chars)
        s: scholarId.substring(scholarId.length - 4), // Last 4 chars of scholar ID
        o: organizationId.substring(organizationId.length - 4), // Last 4 chars of org ID
        t: Math.floor(timestamp / 1000), // Unix timestamp (seconds)
        a: attendanceType === 'checkIn' ? 'I' : 'O', // I for In, O for Out
        l: locationValid ? 1 : 0, // Location valid flag
        v: 1 // Version
      };
      
      // Convert to base64 for compact QR code
      const qrData = Buffer.from(JSON.stringify(qrProof)).toString('base64');
      
      // Log the size of the QR data
      logger.info(`QR data size: ${qrData.length} characters for proof ${proofId}`);
      
      return {
        qrData,
        proofId,
        expiresAt: new Date(timestamp + 5 * 60 * 1000) // 5 minutes expiry
      };
    } catch (error) {
      logger.error('Error generating attendance QR:', error);
      throw error;
    }
  }

  /**
   * Verify an attendance proof
   */
  async verifyAttendanceProof(proof) {
    try {
      if (this.isSimulationMode) {
        // Simulation: Basic validation
        const isValid = proof && 
                       proof.proofId && 
                       proof.publicInputs &&
                       proof.publicInputs.scholarId && 
                       proof.publicInputs.timestamp &&
                       proof.proof;
        
        // Additional checks for proof structure
        if (isValid && proof.proof) {
          try {
            const zkProof = typeof proof.proof === 'string' ? 
              JSON.parse(proof.proof) : proof.proof;
            
            return zkProof.pi_a && zkProof.pi_b && zkProof.pi_c;
          } catch (e) {
            return false;
          }
        }
        
        return isValid;
      } else {
        // Production: Use snarkjs to verify
        throw new Error('Production proof verification not implemented');
      }
    } catch (error) {
      logger.error('Error verifying attendance proof:', error);
      return false;
    }
  }

  /**
   * Get current keys
   */
  getKeys() {
    return this.keys;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.keys !== null;
  }
}

// Create singleton instance
const enhancedZKPService = new EnhancedZKPService();

export default enhancedZKPService;