// mobile/PramaanExpo/src/screens/scholar/BiometricEnrollmentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import biometricService from '../../services/biometricService';
import api from '../../services/api';

const BiometricEnrollmentScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    hasFingerprint: false,
    hasFace: false,
  });
  const [biometricSupport, setBiometricSupport] = useState(null);

  useEffect(() => {
    checkBiometricSupport();
    checkEnrollmentStatus();
  }, []);

  const checkBiometricSupport = async () => {
    const support = await biometricService.checkBiometricSupport();
    setBiometricSupport(support);
  };

  const checkEnrollmentStatus = async () => {
    try {
      // Check local enrollment status
      const localStatus = await biometricService.checkEnrollment(user.scholarId);
      
      // Check backend enrollment status
      try {
        const response = await api.get('/biometric/status');
        if (response.data.success) {
          setEnrollmentStatus({
            hasFingerprint: response.data.enrollmentStatus.hasFingerprint || false,
            hasFace: response.data.enrollmentStatus.hasFace || false,
          });
        }
      } catch (error) {
        // If backend check fails, use local status
        setEnrollmentStatus({
          hasFingerprint: localStatus.hasFingerprint || false,
          hasFace: localStatus.hasFace || false,
        });
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const enrollBiometricWithBackend = async (biometricType, commitment) => {
    try {
      // Register commitment with backend
      const response = await api.post('/biometric/enroll', {
        commitment: commitment.commitment,
        biometricType
      });

      if (!response.data.success) {
        throw new Error('Failed to register with backend');
      }

      return true;
    } catch (error) {
      console.error('Backend enrollment error:', error);
      // Continue with local enrollment even if backend fails
      return false;
    }
  };

  const enrollFingerprint = async () => {
    try {
      setLoading(true);

      // Check if device supports biometric
      if (!biometricSupport?.hasHardware) {
        Alert.alert('Not Supported', 'Your device does not support biometric authentication.');
        return;
      }

      if (!biometricSupport?.isEnrolled) {
        Alert.alert(
          'No Biometrics Found',
          'Please set up fingerprint or face ID in your device settings first.'
        );
        return;
      }

      // Authenticate using fingerprint/face ID
      const authResult = await biometricService.authenticateWithFingerprint();

      if (!authResult.success) {
        Alert.alert('Authentication Failed', authResult.error || 'Failed to authenticate');
        return;
      }

      // Generate biometric commitment
      const commitment = await biometricService.generateBiometricCommitment({
        type: 'fingerprint',
        timestamp: Date.now(),
      });

      // Store biometric data locally
      const existingData = await biometricService.getBiometricData(user.scholarId) || {};
      await biometricService.storeBiometricData(user.scholarId, {
        ...existingData,
        fingerprintCommitment: commitment,
      });

      // Update enrollment status locally
      await biometricService.saveBiometricEnrollment(user.scholarId, true);

      // Register with backend
      const backendSuccess = await enrollBiometricWithBackend('fingerprint', commitment);

      Alert.alert(
        'Success',
        `Fingerprint enrolled successfully${backendSuccess ? '' : ' (offline mode)'}! You can now use it to mark attendance.`,
        [{ text: 'OK', onPress: () => checkEnrollmentStatus() }]
      );
    } catch (error) {
      console.error('Fingerprint enrollment error:', error);
      Alert.alert('Error', 'Failed to enroll fingerprint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const enrollFace = async () => {
    try {
      setLoading(true);

      // Capture face image
      const faceData = await biometricService.captureFace();
      
      if (!faceData) {
        Alert.alert('Cancelled', 'Face capture was cancelled.');
        return;
      }

      // Generate biometric commitment for face
      const commitment = await biometricService.generateBiometricCommitment({
        type: 'face',
        timestamp: Date.now(),
      });

      // Store biometric data locally
      const existingData = await biometricService.getBiometricData(user.scholarId) || {};
      await biometricService.storeBiometricData(user.scholarId, {
        ...existingData,
        faceCommitment: commitment,
      });

      // Update enrollment status locally
      await biometricService.saveBiometricEnrollment(user.scholarId, true);

      // Register with backend
      const backendSuccess = await enrollBiometricWithBackend('face', commitment);

      Alert.alert(
        'Success',
        `Face enrolled successfully${backendSuccess ? '' : ' (offline mode)'}! You can now use it to mark attendance.`,
        [{ text: 'OK', onPress: () => checkEnrollmentStatus() }]
      );
    } catch (error) {
      console.error('Face enrollment error:', error);
      Alert.alert('Error', 'Failed to enroll face. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFullyEnrolled = enrollmentStatus.hasFingerprint || enrollmentStatus.hasFace;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Biometric Enrollment</Text>
          <View style={{ width: 24 }} />
        </View>

        {isFullyEnrolled && (
          <Card style={styles.successCard}>
            <Card.Content style={styles.successContent}>
              <Icon name="check-circle" size={48} color="#4CAF50" />
              <Text style={styles.successText}>Biometrics Enrolled</Text>
              <Text style={styles.successSubtext}>
                You can now mark attendance using your biometrics
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('MarkAttendance')}
                style={styles.attendanceButton}
              >
                Mark Attendance
              </Button>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoTitle}>Privacy-Preserving Attendance</Text>
            <Text style={styles.infoText}>
              • Your biometric data never leaves your device
            </Text>
            <Text style={styles.infoText}>
              • Only cryptographic proofs are shared
            </Text>
            <Text style={styles.infoText}>
              • Zero-knowledge proofs ensure privacy
            </Text>
            <Text style={styles.infoText}>
              • Quick daily check-in/check-out
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.biometricCard}>
          <Card.Title 
            title="Fingerprint / Face ID"
            subtitle={enrollmentStatus.hasFingerprint ? "Enrolled" : "Not enrolled"}
            left={(props) => (
              <Icon 
                {...props} 
                name="fingerprint" 
                size={40} 
                color={enrollmentStatus.hasFingerprint ? "#4CAF50" : "#9E9E9E"} 
              />
            )}
          />
          <Card.Content>
            <Text style={styles.biometricDescription}>
              Use your device's built-in fingerprint scanner or Face ID for quick authentication
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode={enrollmentStatus.hasFingerprint ? "outlined" : "contained"}
              onPress={enrollFingerprint}
              disabled={loading}
              style={styles.enrollButton}
            >
              {enrollmentStatus.hasFingerprint ? "Re-enroll" : "Enroll Fingerprint"}
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.biometricCard}>
          <Card.Title 
            title="Face Recognition"
            subtitle={enrollmentStatus.hasFace ? "Enrolled" : "Not enrolled"}
            left={(props) => (
              <Icon 
                {...props} 
                name="face" 
                size={40} 
                color={enrollmentStatus.hasFace ? "#4CAF50" : "#9E9E9E"} 
              />
            )}
          />
          <Card.Content>
            <Text style={styles.biometricDescription}>
              Capture your face using the camera for visual authentication
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode={enrollmentStatus.hasFace ? "outlined" : "contained"}
              onPress={enrollFace}
              disabled={loading}
              style={styles.enrollButton}
            >
              {enrollmentStatus.hasFace ? "Re-enroll" : "Enroll Face"}
            </Button>
          </Card.Actions>
        </Card>

        {biometricSupport && !biometricSupport.hasHardware && (
          <Card style={styles.warningCard}>
            <Card.Content>
              <View style={styles.warningContent}>
                <Icon name="warning" size={24} color="#FF9800" />
                <Text style={styles.warningText}>
                  Your device doesn't support biometric authentication
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {biometricSupport && biometricSupport.hasHardware && !biometricSupport.isEnrolled && (
          <Card style={styles.warningCard}>
            <Card.Content>
              <View style={styles.warningContent}>
                <Icon name="info" size={24} color="#2196F3" />
                <Text style={styles.warningText}>
                  Please set up fingerprint or Face ID in your device settings first
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  successCard: {
    margin: 15,
    backgroundColor: '#E8F5E9',
    elevation: 2,
  },
  successContent: {
    alignItems: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  attendanceButton: {
    marginTop: 15,
    backgroundColor: '#6C63FF',
  },
  infoCard: {
    margin: 15,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  biometricCard: {
    margin: 15,
    elevation: 2,
  },
  biometricDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  enrollButton: {
    flex: 1,
  },
  warningCard: {
    margin: 15,
    backgroundColor: '#FFF3E0',
    elevation: 2,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BiometricEnrollmentScreen;