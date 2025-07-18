// backend/test/zkp.test.js
import { expect } from 'chai';
import ZKPService from '../src/services/zkp.service.js';

describe('ZKP Service Tests', () => {
  before(async () => {
    await ZKPService.initialize();
  });

  it('should generate valid commitment', async () => {
    const biometricData = {
      type: 'fingerprint',
      data: 'mock-fingerprint-data'
    };
    
    const commitment = await ZKPService.generateBiometricCommitment(
      biometricData,
      'scholar-123'
    );
    
    expect(commitment).to.have.property('commitment');
    expect(commitment).to.have.property('nullifier');
    expect(commitment).to.have.property('encryptedSalt');
  });

  it('should generate and verify proof', async () => {
    const biometricData = {
      type: 'fingerprint',
      data: 'mock-fingerprint-data'
    };
    
    // Generate commitment
    const commitment = await ZKPService.generateBiometricCommitment(
      biometricData,
      'scholar-123'
    );
    
    // Generate proof
    const proof = await ZKPService.generateAttendanceProof(
      'scholar-123',
      biometricData,
      commitment,
      { latitude: 28.6139, longitude: 77.2090 },
      Date.now()
    );
    
    // Verify proof
    const isValid = await ZKPService.verifyAttendanceProof(proof);
    expect(isValid).to.be.true;
  });
});