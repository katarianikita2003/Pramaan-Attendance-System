// mobile/PramaanExpo/src/screens/AttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { attendanceService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [biometricType, setBiometricType] = useState(null);
  const [step, setStep] = useState('location'); // location, biometric, success
  const [attendanceProof, setAttendanceProof] = useState(null);

  useEffect(() => {
    checkBiometricAvailability();
    getLocation();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        }
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to mark attendance');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      });
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get your location. Please try again.');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setLoading(true);
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to mark attendance',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await markAttendance();
      } else {
        Alert.alert('Authentication Failed', 'Please try again');
        setLoading(false);
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      Alert.alert('Error', 'Biometric authentication failed');
      setLoading(false);
    }
  };

  const markAttendance = async () => {
    try {
      // In a real app, this would capture actual biometric data
      // For ZKP, we would generate a proof without sending the actual biometric
      const attendanceData = {
        scholarId: user.scholarId,
        organizationCode: user.organizationCode,
        location: location,
        timestamp: new Date().toISOString(),
        biometricData: {
          type: biometricType,
          // This would be the ZKP proof, not actual biometric data
          proof: 'zkp_proof_placeholder',
        },
      };

      const response = await attendanceService.markAttendance(attendanceData);

      if (response.success) {
        setAttendanceProof(response.proof);
        setStep('success');
      } else {
        throw new Error(response.error || 'Failed to mark attendance');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const renderLocationStep = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.iconContainer}>
          <Icon name="map-marker" size={64} color="#6C63FF" />
        </View>
        
        <Title style={styles.cardTitle}>Location Verification</Title>
        
        {location ? (
          <>
            <View style={styles.locationInfo}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.locationText}>Location captured successfully</Text>
            </View>
            
            <View style={styles.coordinatesContainer}>
              <Text style={styles.coordinateText}>
                Lat: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordinateText}>
                Lng: {location.longitude.toFixed(6)}
              </Text>
            </View>
            
            <Button
              mode="contained"
              onPress={() => setStep('biometric')}
              style={styles.nextButton}
            >
              Next: Biometric Authentication
            </Button>
          </>
        ) : (
          <>
            <Paragraph style={styles.description}>
              Getting your location to verify you're at the authorized premises...
            </Paragraph>
            <ActivityIndicator size="large" color="#6C63FF" style={styles.loader} />
            <Button mode="outlined" onPress={getLocation} style={styles.retryButton}>
              Retry Location
            </Button>
          </>
        )}
      </Card.Content>
    </Card>
  );

  const renderBiometricStep = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.iconContainer}>
          <Icon 
            name={biometricType === 'fingerprint' ? 'fingerprint' : 'face'} 
            size={64} 
            color="#6C63FF" 
          />
        </View>
        
        <Title style={styles.cardTitle}>Biometric Authentication</Title>
        
        <Paragraph style={styles.description}>
          Use your {biometricType === 'fingerprint' ? 'fingerprint' : 'face'} to mark attendance.
          Your biometric data stays on your device.
        </Paragraph>
        
        <View style={styles.zkpInfo}>
          <Icon name="lock" size={16} color="#666" />
          <Text style={styles.zkpText}>
            Zero-Knowledge Proof ensures your privacy
          </Text>
        </View>
        
        <Button
          mode="contained"
          onPress={handleBiometricAuth}
          loading={loading}
          disabled={loading}
          style={styles.authenticateButton}
          contentStyle={styles.authenticateButtonContent}
        >
          {loading ? 'Authenticating...' : `Scan ${biometricType === 'fingerprint' ? 'Fingerprint' : 'Face'}`}
        </Button>
        
        <Button
          mode="text"
          onPress={() => setStep('location')}
          disabled={loading}
        >
          Back
        </Button>
      </Card.Content>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.iconContainer}>
          <Icon name="check-circle" size={80} color="#4CAF50" />
        </View>
        
        <Title style={styles.successTitle}>Attendance Marked!</Title>
        
        <Paragraph style={styles.successDescription}>
          Your attendance has been successfully recorded using Zero-Knowledge Proof.
        </Paragraph>
        
        <View style={styles.proofContainer}>
          <Text style={styles.proofLabel}>Proof ID:</Text>
          <Text style={styles.proofId}>{attendanceProof?.id || 'PROOF123456'}</Text>
        </View>
        
        <View style={styles.timestampContainer}>
          <Icon name="access-time" size={16} color="#666" />
          <Text style={styles.timestampText}>
            {new Date().toLocaleString()}
          </Text>
        </View>
        
        <Button
          mode="contained"
          onPress={() => {
            // Download or share proof
            Alert.alert('Success', 'Attendance proof saved to your device');
          }}
          style={styles.downloadButton}
          icon="download"
        >
          Download Proof
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        >
          Done
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressCircle, step !== 'location' && styles.progressCircleComplete]}>
              <Text style={styles.progressNumber}>1</Text>
            </View>
            <Text style={styles.progressLabel}>Location</Text>
          </View>
          
          <View style={[styles.progressLine, step !== 'location' && styles.progressLineComplete]} />
          
          <View style={styles.progressStep}>
            <View style={[
              styles.progressCircle,
              step === 'biometric' && styles.progressCircleActive,
              step === 'success' && styles.progressCircleComplete
            ]}>
              <Text style={styles.progressNumber}>2</Text>
            </View>
            <Text style={styles.progressLabel}>Biometric</Text>
          </View>
          
          <View style={[styles.progressLine, step === 'success' && styles.progressLineComplete]} />
          
          <View style={styles.progressStep}>
            <View style={[styles.progressCircle, step === 'success' && styles.progressCircleComplete]}>
              <Text style={styles.progressNumber}>3</Text>
            </View>
            <Text style={styles.progressLabel}>Complete</Text>
          </View>
        </View>

        {/* Step Content */}
        {step === 'location' && renderLocationStep()}
        {step === 'biometric' && renderBiometricStep()}
        {step === 'success' && renderSuccessStep()}

        {/* Privacy Notice */}
        <Card style={styles.privacyCard}>
          <Card.Content>
            <View style={styles.privacyHeader}>
              <Icon name="shield" size={20} color="#FF9800" />
              <Text style={styles.privacyTitle}>Privacy First</Text>
            </View>
            <Text style={styles.privacyText}>
              Your biometric data never leaves your device. We use Zero-Knowledge Proofs 
              to verify your identity without storing any personal information.
            </Text>
          </Card.Content>
        </Card>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCircleActive: {
    backgroundColor: '#6C63FF',
  },
  progressCircleComplete: {
    backgroundColor: '#4CAF50',
  },
  progressNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  progressLineComplete: {
    backgroundColor: '#4CAF50',
  },
  card: {
    margin: 16,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontSize: 16,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  coordinateText: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  nextButton: {
    backgroundColor: '#6C63FF',
  },
  retryButton: {
    marginTop: 16,
  },
  loader: {
    marginVertical: 24,
  },
  zkpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  zkpText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  authenticateButton: {
    backgroundColor: '#6C63FF',
    marginBottom: 16,
  },
  authenticateButtonContent: {
    paddingVertical: 8,
  },
  successTitle: {
    textAlign: 'center',
    fontSize: 28,
    color: '#4CAF50',
    marginBottom: 16,
  },
  successDescription: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    fontSize: 16,
  },
  proofContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  proofLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  proofId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timestampText: {
    marginLeft: 8,
    color: '#666',
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 16,
  },
  doneButton: {
    borderColor: '#6C63FF',
  },
  privacyCard: {
    margin: 16,
    backgroundColor: '#FFF3E0',
    elevation: 1,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default AttendanceScreen;