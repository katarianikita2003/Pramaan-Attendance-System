// ===== mobile/src/contexts/BiometricContext.js =====
import React, { createContext, useState, useContext, useEffect } from 'react';
import { biometricService } from '../services/biometric.service';
import { zkpService } from '../services/zkp.service';

const BiometricContext = createContext({});

export const BiometricProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [biometricData, setBiometricData] = useState({
    fingerprint: null,
    face: null
  });
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    fingerprint: false,
    face: false
  });

  useEffect(() => {
    initializeBiometric();
  }, []);

  const initializeBiometric = async () => {
    try {
      await biometricService.initialize();
      await zkpService.initialize();
      setIsInitialized(true);
    } catch (error) {
      console.error('Biometric initialization error:', error);
    }
  };

  const enrollFingerprint = async (scholarId) => {
    try {
      const fingerprintData = await biometricService.enrollFingerprint(scholarId);
      setBiometricData(prev => ({ ...prev, fingerprint: fingerprintData }));
      setEnrollmentStatus(prev => ({ ...prev, fingerprint: true }));
      return fingerprintData;
    } catch (error) {
      throw error;
    }
  };

  const enrollFace = async (scholarId) => {
    try {
      const faceData = await biometricService.enrollFace(scholarId);
      setBiometricData(prev => ({ ...prev, face: faceData }));
      setEnrollmentStatus(prev => ({ ...prev, face: true }));
      return faceData;
    } catch (error) {
      throw error;
    }
  };

  const captureBiometric = async (type, data) => {
    const captured = {
      type,
      data,
      timestamp: Date.now()
    };
    
    setBiometricData(prev => ({
      ...prev,
      [type]: captured
    }));
    
    return captured;
  };

  const verifyBiometric = async (type, scholarId) => {
    if (type === 'fingerprint') {
      return await biometricService.verifyFingerprint(scholarId);
    } else if (type === 'face') {
      return await biometricService.captureFaceWithLiveness();
    }
    throw new Error(`Unknown biometric type: ${type}`);
  };

  const generateBiometricHash = async () => {
    if (!biometricData.fingerprint || !biometricData.face) {
      throw new Error('Both fingerprint and face data required');
    }
    
    return await biometricService.createBiometricHash(
      biometricData.fingerprint,
      biometricData.face
    );
  };

  const generateCommitment = async () => {
    return await zkpService.generateBiometricCommitment(biometricData);
  };

  const clearBiometricData = () => {
    setBiometricData({
      fingerprint: null,
      face: null
    });
  };

  const value = {
    isInitialized,
    biometricData,
    enrollmentStatus,
    enrollFingerprint,
    enrollFace,
    captureBiometric,
    verifyBiometric,
    generateBiometricHash,
    generateCommitment,
    clearBiometricData
  };

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
};

export const useBiometric = () => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within BiometricProvider');
  }
  return context;
};