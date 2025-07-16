// mobile/PramaanExpo/src/screens/BiometricEnrollmentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import {
  Card,
  Button,
  RadioButton,
  ActivityIndicator,
  ProgressBar,
  IconButton,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import biometricService from '../services/biometricService';
import { scholarService } from '../services/api';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const BiometricEnrollmentScreen = ({ navigation, route }) => {
  // Check if this is for registration or existing scholar
  const isRegistration = route.params?.isRegistration || false;
  const { orgData, personalInfo, academicInfo, password } = route.params || {};
  
  // For existing scholars
  const { user } = useAuth();
  const scholarId = user?.scholarId;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState('both');
  const [faceData, setFaceData] = useState(null);
  const [fingerprintData, setFingerprintData] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    hasFingerprint: false,
    hasFace: false
  });

  useEffect(() => {
    checkBiometricAvailability();
    if (!isRegistration && scholarId) {
      checkExistingEnrollment();
    }
  }, []);

  const checkBiometricAvailability = async () => {
    const result = await biometricService.checkBiometricAvailability();
    setBiometricAvailable(result.available);
    
    if (!result.available) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is required. Please ensure your device supports fingerprint or face recognition.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const checkExistingEnrollment = async () => {
    try {
      const response = await api.get('/biometric/status');
      if (response.data) {
        setEnrollmentStatus({
          hasFingerprint: response.data.hasFingerprint || false,
          hasFace: response.data.hasFace || false
        });
      }
    } catch (error) {
      console.error('Error checking enrollment status:', error);
    }
  };

  const captureFace = async () => {
    try {
      setLoading(true);
      
      const faceImage = await biometricService.captureFace();
      
      if (faceImage) {
        setFaceData({
          type: 'face',
          uri: faceImage.uri,
          base64: faceImage.base64,
          timestamp: Date.now(),
        });
        
        Alert.alert('Success', 'Face captured successfully!');
        
        if (biometricType === 'face') {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture face');
    } finally {
      setLoading(false);
    }
  };

  const captureFingerprint = async () => {
    try {
      setLoading(true);
      
      const result = await biometricService.authenticateWithFingerprint();

      if (result.success) {
        setFingerprintData({
          type: 'fingerprint',
          hash: result.hash,
          timestamp: Date.now(),
        });
        
        Alert.alert('Success', 'Fingerprint captured successfully!');
        setStep(3);
      } else {
        Alert.alert('Error', result.error || 'Fingerprint capture failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const enrollBiometricToBackend = async (type, data) => {
    try {
      // Generate commitment
      const commitment = await biometricService.generateBiometricCommitment(data);
      
      // Prepare enrollment data
      const enrollmentData = {
        scholarId: scholarId || personalInfo?.email, // Use scholarId for existing, email for new
        type: type,
        biometricData: {}
      };

      if (type === 'fingerprint') {
        enrollmentData.biometricData.fingerprintTemplate = data.hash || commitment.hash;
        enrollmentData.biometricData.fingerprintCommitment = commitment.commitment;
      } else if (type === 'face') {
        // For face, send as form data if image is involved
        if (data.uri) {
          const formData = new FormData();
          formData.append('scholarId', enrollmentData.scholarId);
          formData.append('type', 'face');
          formData.append('faceImage', {
            uri: data.uri,
            type: 'image/jpeg',
            name: 'face.jpg'
          });
          
          return await api.post('/biometric/enroll', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        } else {
          enrollmentData.biometricData.faceCommitment = commitment.commitment;
        }
      }

      // Send enrollment request
      const response = await api.post('/biometric/enroll', enrollmentData);
      
      if (response.data.success) {
        // Save commitment locally
        const existingData = await biometricService.getBiometricData(scholarId) || {};
        const updatedData = {
          ...existingData,
          [`${type}Commitment`]: commitment,
          enrolledAt: existingData.enrolledAt || new Date().toISOString()
        };
        
        await biometricService.storeBiometricData(scholarId, updatedData);
        
        return { success: true };
      }
      
      throw new Error(response.data.error || 'Enrollment failed');
    } catch (error) {
      console.error(`${type} enrollment error:`, error);
      throw error;
    }
  };

  const completeEnrollment = async () => {
    try {
      setLoading(true);
      const errors = [];

      // Enroll fingerprint if captured
      if (fingerprintData && !enrollmentStatus.hasFingerprint) {
        try {
          await enrollBiometricToBackend('fingerprint', fingerprintData);
          console.log('Fingerprint enrolled successfully');
        } catch (error) {
          errors.push(`Fingerprint: ${error.message}`);
        }
      }

      // Enroll face if captured
      if (faceData && !enrollmentStatus.hasFace) {
        try {
          await enrollBiometricToBackend('face', faceData);
          console.log('Face enrolled successfully');
        } catch (error) {
          errors.push(`Face: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        Alert.alert('Enrollment Errors', errors.join('\n'));
        return;
      }

      // If this is part of registration, complete the registration
      if (isRegistration) {
        await completeRegistration();
      } else {
        // For existing scholars, just show success
        Alert.alert(
          'Success!',
          'Biometric enrollment completed successfully. You can now mark attendance.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ScholarDashboard')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      Alert.alert('Error', 'Failed to complete enrollment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    try {
      // Generate biometric commitments
      const biometricCommitments = {};
      
      if (faceData) {
        const faceCommitment = await biometricService.generateBiometricCommitment(faceData);
        biometricCommitments.faceCommitment = faceCommitment;
      }
      
      if (fingerprintData) {
        const fingerprintCommitment = await biometricService.generateBiometricCommitment(fingerprintData);
        biometricCommitments.fingerprintCommitment = fingerprintCommitment;
      }
      
      // Prepare registration data
      const registrationData = {
        organizationCode: orgData.code,
        personalInfo: {
          ...personalInfo,
          profileImage: faceData?.uri,
        },
        academicInfo,
        password,
        biometrics: biometricCommitments,
      };
      
      console.log('Registering scholar with biometric data...');
      
      // Register scholar
      const response = await scholarService.register(registrationData);
      
      if (response.success) {
        Alert.alert(
          'Registration Successful!',
          'Your account has been created with biometric enrollment. You can now login and mark attendance.',
          [
            {
              text: 'Login Now',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login', params: { userType: 'scholar' } }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Registration Failed', response.error || 'Please try again');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', 'Please check your connection and try again');
    }
  };

  const renderBiometricSelection = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>Biometric Enrollment</Text>
        <Text style={styles.description}>
          {isRegistration 
            ? 'Select the biometric authentication method for secure attendance marking.'
            : 'Complete your biometric enrollment to enable attendance marking.'}
        </Text>

        {!isRegistration && (enrollmentStatus.hasFingerprint || enrollmentStatus.hasFace) && (
          <Surface style={styles.statusSurface}>
            <Text style={styles.statusTitle}>Current Enrollment Status:</Text>
            <View style={styles.statusRow}>
              <Icon 
                name="fingerprint" 
                size={20} 
                color={enrollmentStatus.hasFingerprint ? '#4CAF50' : '#999'} 
              />
              <Text style={[styles.statusText, enrollmentStatus.hasFingerprint && styles.statusTextActive]}>
                Fingerprint: {enrollmentStatus.hasFingerprint ? 'Enrolled' : 'Not Enrolled'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Icon 
                name="face" 
                size={20} 
                color={enrollmentStatus.hasFace ? '#4CAF50' : '#999'} 
              />
              <Text style={[styles.statusText, enrollmentStatus.hasFace && styles.statusTextActive]}>
                Face: {enrollmentStatus.hasFace ? 'Enrolled' : 'Not Enrolled'}
              </Text>
            </View>
          </Surface>
        )}
        
        <RadioButton.Group
          onValueChange={setBiometricType}
          value={biometricType}
        >
          <RadioButton.Item 
            label="Face Recognition" 
            value="face"
            left={() => <Icon name="face" size={24} />}
            disabled={!isRegistration && enrollmentStatus.hasFace}
          />
          <RadioButton.Item 
            label="Fingerprint" 
            value="fingerprint"
            left={() => <Icon name="fingerprint" size={24} />}
            disabled={!isRegistration && enrollmentStatus.hasFingerprint}
          />
          <RadioButton.Item 
            label="Both (Recommended)" 
            value="both"
            left={() => <Icon name="security" size={24} />}
            disabled={!isRegistration && enrollmentStatus.hasFingerprint && enrollmentStatus.hasFace}
          />
        </RadioButton.Group>
        
        <Button
          mode="contained"
          onPress={() => {
            if (biometricType === 'fingerprint') {
              setStep(2);
            } else {
              setStep(1.5);
            }
          }}
          style={styles.button}
          disabled={!isRegistration && enrollmentStatus.hasFingerprint && enrollmentStatus.hasFace}
        >
          Continue
        </Button>
      </Card.Content>
    </Card>
  );

  const renderFaceCapture = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>Capture Your Face</Text>
        <Text style={styles.description}>
          Please take a clear photo of your face for biometric enrollment.
        </Text>
        
        {faceData && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: faceData.uri }} style={styles.faceImage} />
            <Text style={styles.successText}>✓ Face captured successfully</Text>
          </View>
        )}
        
        <Button
          mode="contained"
          onPress={captureFace}
          loading={loading}
          disabled={loading}
          style={styles.button}
          icon="camera"
        >
          {faceData ? 'Retake Photo' : 'Take Photo'}
        </Button>
        
        {faceData && (
          <Button
            mode="outlined"
            onPress={() => biometricType === 'both' ? setStep(2) : setStep(3)}
            style={styles.button}
          >
            Continue
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const renderFingerprintCapture = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>Fingerprint Enrollment</Text>
        <Text style={styles.description}>
          Place your finger on the device sensor to enroll your fingerprint.
        </Text>
        
        <View style={styles.fingerprintContainer}>
          <Icon 
            name="fingerprint" 
            size={100} 
            color={fingerprintData ? '#4CAF50' : '#6C63FF'} 
          />
          {fingerprintData && (
            <Text style={styles.successText}>✓ Fingerprint captured successfully</Text>
          )}
        </View>
        
        <Button
          mode="contained"
          onPress={captureFingerprint}
          loading={loading}
          disabled={loading}
          style={styles.button}
          icon="fingerprint"
        >
          {fingerprintData ? 'Re-enroll Fingerprint' : 'Enroll Fingerprint'}
        </Button>
        
        {fingerprintData && (
          <Button
            mode="outlined"
            onPress={() => setStep(3)}
            style={styles.button}
          >
            Continue
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const renderCompletion = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>
          {isRegistration ? 'Complete Registration' : 'Complete Enrollment'}
        </Text>
        <Text style={styles.description}>
          Your biometric data has been captured and will be processed using Zero-Knowledge Proof cryptography to ensure complete privacy.
        </Text>
        
        <View style={styles.summaryContainer}>
          {faceData && (
            <View style={styles.summaryItem}>
              <Icon name="face" size={24} color="#4CAF50" />
              <Text style={styles.summaryText}>Face Recognition Ready</Text>
            </View>
          )}
          {fingerprintData && (
            <View style={styles.summaryItem}>
              <Icon name="fingerprint" size={24} color="#4CAF50" />
              <Text style={styles.summaryText}>Fingerprint Ready</Text>
            </View>
          )}
        </View>
        
        <Surface style={styles.privacyNote}>
          <Icon name="lock" size={16} color="#666" />
          <Text style={styles.privacyText}>
            Your biometric data never leaves your device. Only cryptographic proofs are stored.
          </Text>
        </Surface>
        
        <Button
          mode="contained"
          onPress={completeEnrollment}
          loading={loading}
          disabled={loading || (!faceData && !fingerprintData)}
          style={styles.button}
          icon="check"
        >
          {isRegistration ? 'Complete Registration' : 'Complete Enrollment'}
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          onPress={() => navigation.goBack()} 
        />
        <Text style={styles.headerTitle}>Biometric Enrollment</Text>
        <View style={{ width: 48 }} />
      </View>
      
      <ProgressBar progress={step / 3} color="#6C63FF" style={styles.progress} />
      
      <ScrollView style={styles.content}>
        {step === 1 && renderBiometricSelection()}
        {step === 1.5 && renderFaceCapture()}
        {step === 2 && renderFingerprintCapture()}
        {step === 3 && renderCompletion()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progress: {
    height: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusSurface: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#999',
  },
  statusTextActive: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  button: {
    marginTop: 15,
    paddingVertical: 6,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  faceImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
  },
  fingerprintContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
  },
  summaryContainer: {
    marginVertical: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 15,
    borderRadius: 8,
    elevation: 1,
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});

export default BiometricEnrollmentScreen;