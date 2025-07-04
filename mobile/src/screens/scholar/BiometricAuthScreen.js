// ===== mobile/src/screens/scholar/BiometricAuthScreen.js =====
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Image,
  Dimensions
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ProgressBar,
  Chip,
  Portal,
  Modal,
  ActivityIndicator
} from 'react-native-paper';
import ReactNativeBiometrics from 'react-native-biometrics';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometric } from '../../contexts/BiometricContext';
import FaceScanner from '../../components/biometric/FaceScanner';
import { LocationService } from '../../services/location.service';

const { width: screenWidth } = Dimensions.get('window');

const BiometricAuthScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { captureBiometric, generateBiometricHash } = useBiometric();
  
  const [step, setStep] = useState('fingerprint'); // fingerprint, face, location, generating
  const [progress, setProgress] = useState(0);
  const [biometricData, setBiometricData] = useState({
    fingerprint: null,
    face: null
  });
  const [location, setLocation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    
    if (!available) {
      Alert.alert(
        'Biometric Not Available',
        'Your device does not support biometric authentication. Please contact your administrator.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handleFingerprintAuth = async () => {
    setIsProcessing(true);
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      
      const epochTimeSeconds = Math.round((new Date()).getTime() / 1000).toString();
      const payload = `${user.scholarId}_${epochTimeSeconds}`;
      
      const { success, signature, error } = await rnBiometrics.createSignature({
        promptMessage: 'Scan your fingerprint for attendance',
        payload,
        cancelButtonText: 'Cancel'
      });

      if (success) {
        const fingerprintData = {
          signature,
          payload,
          timestamp: Date.now(),
          type: 'fingerprint'
        };
        
        setBiometricData(prev => ({ ...prev, fingerprint: fingerprintData }));
        setProgress(0.33);
        setStep('face');
      } else {
        Alert.alert('Authentication Failed', error || 'Fingerprint authentication failed');
      }
    } catch (error) {
      console.error('Fingerprint error:', error);
      Alert.alert('Error', 'Failed to authenticate fingerprint');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFaceCapture = async (faceData) => {
    setBiometricData(prev => ({ ...prev, face: faceData }));
    setProgress(0.66);
    setStep('location');
    
    // Get location
    try {
      const locationData = await LocationService.getCurrentLocation();
      setLocation(locationData);
      setProgress(1);
      setStep('generating');
      
      // Navigate to proof generation
      setTimeout(() => {
        navigation.navigate('ProofGeneration', {
          biometricData: { ...biometricData, face: faceData },
          location: locationData
        });
      }, 500);
    } catch (error) {
      Alert.alert('Location Error', 'Failed to get your location. Please enable location services.');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'fingerprint':
        return (
          <Card style={styles.stepCard}>
            <Card.Content style={styles.centerContent}>
              <Image 
                source={require('../../assets/images/fingerprint.png')}
                style={styles.biometricImage}
              />
              <Title>Step 1: Fingerprint Authentication</Title>
              <Paragraph style={styles.instruction}>
                Place your registered finger on the sensor when prompted
              </Paragraph>
              <Button
                mode="contained"
                onPress={handleFingerprintAuth}
                loading={isProcessing}
                disabled={isProcessing}
                style={styles.actionButton}
              >
                Scan Fingerprint
              </Button>
            </Card.Content>
          </Card>
        );

      case 'face':
        return (
          <Card style={styles.stepCard}>
            <Card.Content>
              <Title>Step 2: Face Recognition</Title>
              <Paragraph style={styles.instruction}>
                Position your face in the frame and follow the instructions
              </Paragraph>
              <FaceScanner
                onCapture={handleFaceCapture}
                onError={(error) => {
                  Alert.alert('Face Scan Error', error.message);
                }}
              />
            </Card.Content>
          </Card>
        );

      case 'location':
        return (
          <Card style={styles.stepCard}>
            <Card.Content style={styles.centerContent}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Title style={styles.processingTitle}>Getting Location</Title>
              <Paragraph style={styles.instruction}>
                Verifying your location...
              </Paragraph>
            </Card.Content>
          </Card>
        );

      case 'generating':
        return (
          <Card style={styles.stepCard}>
            <Card.Content style={styles.centerContent}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Title style={styles.processingTitle}>Generating Proof</Title>
              <Paragraph style={styles.instruction}>
                Creating your attendance proof...
              </Paragraph>
            </Card.Content>
          </Card>
        );
    }
  };

  return (
    <View style={styles.container}>
      <ProgressBar 
        progress={progress} 
        color="#6200ee" 
        style={styles.progressBar}
      />
      
      <View style={styles.statusContainer}>
        <Chip 
          icon="check" 
          selected={!!biometricData.fingerprint}
          style={styles.statusChip}
        >
          Fingerprint
        </Chip>
        <Chip 
          icon="check" 
          selected={!!biometricData.face}
          style={styles.statusChip}
        >
          Face
        </Chip>
        <Chip 
          icon="check" 
          selected={!!location}
          style={styles.statusChip}
        >
          Location
        </Chip>
      </View>

      {renderStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressBar: {
    height: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  statusChip: {
    backgroundColor: '#e8f5e9',
  },
  stepCard: {
    margin: 16,
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  biometricImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    tintColor: '#6200ee',
  },
  instruction: {
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
    color: '#666',
  },
  actionButton: {
    marginTop: 16,
    paddingHorizontal: 32,
  },
  processingTitle: {
    marginTop: 16,
  },
});

export default BiometricAuthScreen;