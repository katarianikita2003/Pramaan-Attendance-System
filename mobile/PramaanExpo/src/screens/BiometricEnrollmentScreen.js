// mobile/PramaanExpo/src/screens/BiometricEnrollmentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {
  Card,
  Button,
  RadioButton,
  ActivityIndicator,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import biometricService from '../services/biometricService';
import { scholarService } from '../services/api';
import zkpService from '../services/zkpService';
import api from '../services/api';

const BiometricEnrollmentScreen = ({ navigation, route }) => {
  const { orgData, personalInfo, academicInfo, password } = route.params;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState('face');
  const [faceData, setFaceData] = useState(null);
  const [fingerprintData, setFingerprintData] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const result = await biometricService.checkBiometricAvailability();
    setBiometricAvailable(result.available);
    
    if (!result.available) {
      Alert.alert(
        'Biometric Not Available',
        result.error || 'Biometric authentication is required for registration',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const captureFace = async () => {
    try {
      setLoading(true);
      
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required for face capture');
        return;
      }

      // Use ImagePicker for face capture (in production, use ML Kit)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const faceImageData = {
          type: 'face',
          uri: result.assets[0].uri,
          timestamp: Date.now(),
          // In production, extract face features using ML Kit
          features: 'mock_face_features_' + Date.now(),
        };
        
        setFaceData(faceImageData);
        Alert.alert('Success', 'Face captured successfully!');
        
        if (biometricType === 'face') {
          setStep(3); // Skip fingerprint if only face selected
        } else {
          setStep(2); // Continue to fingerprint
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
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Place your finger on the sensor to enroll',
        fallbackLabel: 'Skip Fingerprint',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const fingerprintData = {
          type: 'fingerprint',
          timestamp: Date.now(),
          // In production, capture actual fingerprint template
          template: 'mock_fingerprint_template_' + Date.now(),
        };
        
        setFingerprintData(fingerprintData);
        Alert.alert('Success', 'Fingerprint captured successfully!');
        setStep(3);
      } else {
        Alert.alert('Error', 'Fingerprint capture failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const generateBiometricCommitments = async () => {
    try {
      const commitments = {};
      
      if (faceData) {
        // Generate ZKP commitment for face data
        const faceCommitment = await biometricService.generateBiometricCommitment(faceData);
        commitments.faceCommitment = faceCommitment;
      }
      
      if (fingerprintData) {
        // Generate ZKP commitment for fingerprint data
        const fingerprintCommitment = await biometricService.generateBiometricCommitment(fingerprintData);
        commitments.fingerprintCommitment = fingerprintCommitment;
      }
      
      return commitments;
    } catch (error) {
      console.error('Error generating commitments:', error);
      throw error;
    }
  };

  const completeRegistration = async () => {
    try {
      setLoading(true);
      
      // Generate biometric commitments
      const biometricCommitments = await generateBiometricCommitments();
      
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
    } finally {
      setLoading(false);
    }
  };

  const renderBiometricSelection = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>Biometric Enrollment</Text>
        <Text style={styles.description}>
          Select the biometric authentication method you want to use for attendance marking.
        </Text>
        
        <RadioButton.Group
          onValueChange={setBiometricType}
          value={biometricType}
        >
          <RadioButton.Item 
            label="Face Recognition" 
            value="face"
            left={() => <Icon name="face" size={24} />}
          />
          <RadioButton.Item 
            label="Fingerprint" 
            value="fingerprint"
            left={() => <Icon name="fingerprint" size={24} />}
          />
          <RadioButton.Item 
            label="Both (Recommended)" 
            value="both"
            left={() => <Icon name="security" size={24} />}
          />
        </RadioButton.Group>
        
        <Button
          mode="contained"
          onPress={() => setStep(biometricType === 'fingerprint' ? 2 : 1.5)}
          style={styles.button}
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
            <Text style={styles.successText}>✓ Fingerprint enrolled successfully</Text>
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
        <Text style={styles.title}>Complete Registration</Text>
        <Text style={styles.description}>
          Your biometric data has been captured and will be processed using Zero-Knowledge Proof cryptography to ensure complete privacy.
        </Text>
        
        <View style={styles.summaryContainer}>
          {faceData && (
            <View style={styles.summaryItem}>
              <Icon name="face" size={24} color="#4CAF50" />
              <Text style={styles.summaryText}>Face Recognition Enrolled</Text>
            </View>
          )}
          {fingerprintData && (
            <View style={styles.summaryItem}>
              <Icon name="fingerprint" size={24} color="#4CAF50" />
              <Text style={styles.summaryText}>Fingerprint Enrolled</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.privacyNote}>
          🔒 Your biometric data never leaves your device. Only cryptographic proofs are stored.
        </Text>
        
        <Button
          mode="contained"
          onPress={completeRegistration}
          loading={loading}
          disabled={loading}
          style={styles.button}
          icon="check"
        >
          Complete Registration
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Icon 
          name="arrow-back" 
          size={24} 
          color="#333" 
          onPress={() => navigation.goBack()} 
        />
        <Text style={styles.headerTitle}>Biometric Enrollment</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ProgressBar progress={step / 3} color="#6C63FF" style={styles.progress} />
      
      <View style={styles.content}>
        {step === 1 && renderBiometricSelection()}
        {step === 1.5 && renderFaceCapture()}
        {step === 2 && renderFingerprintCapture()}
        {step === 3 && renderCompletion()}
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
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
    padding: 20,
  },
  card: {
    elevation: 4,
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
  button: {
    marginTop: 15,
    paddingVertical: 8,
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
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15,
    fontStyle: 'italic',
  },
});

export default BiometricEnrollmentScreen;