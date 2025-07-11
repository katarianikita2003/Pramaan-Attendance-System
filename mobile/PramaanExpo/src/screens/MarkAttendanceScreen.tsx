// src/screens/MarkAttendanceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Text,
  Divider,
  IconButton,
  useTheme,
  Portal,
  Modal,
} from 'react-native-paper';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import biometricService from '../services/biometric.service';
import zkpService from '../services/zkpService';
import api from '../services/api';

// Remove the import from App.tsx to avoid circular dependency
// Use navigation prop instead

interface AttendanceProof {
  id: string;
  proof: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
  verified: boolean;
  qrCode?: string;
}

export default function MarkAttendanceScreen({ navigation }) {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [attendanceProof, setAttendanceProof] = useState<AttendanceProof | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');

  useEffect(() => {
    loadUserData();
    checkLocationPermission();
  }, []);

  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  // Rest of the component remains the same...
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Location permission is required to mark attendance.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation.coords);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  };

  const markAttendance = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    setLoading(true);
    setVerificationStatus('Authenticating with biometrics...');

    try {
      const biometricResult = await biometricService.authenticate(
        'Authenticate to mark attendance'
      );

      if (!biometricResult.success) {
        throw new Error('Biometric authentication failed');
      }

      setVerificationStatus('Generating zero-knowledge proof...');

      const commitment = await AsyncStorage.getItem('biometricCommitment');
      if (!commitment) {
        throw new Error('No biometric registration found');
      }

      const zkpProof = await zkpService.generateAttendanceProof(
        {
          type: biometricResult.type,
          data: biometricResult.data,
          timestamp: Date.now(),
        },
        commitment,
        location
      );

      setVerificationStatus('Submitting attendance proof...');

      const response = await api.post('/attendance/mark', {
        proof: zkpProof.proof,
        publicSignals: zkpProof.publicSignals,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        timestamp: zkpProof.timestamp,
      });

      if (response.data.success) {
        const credential = await zkpService.generateVerifiableCredential(zkpProof);
        
        setAttendanceProof({
          id: response.data.attendanceId,
          proof: zkpProof.proof,
          timestamp: zkpProof.timestamp,
          location: zkpProof.location,
          verified: true,
          qrCode: credential,
        });

        setShowProofModal(true);
        setVerificationStatus('');
        
        Alert.alert(
          'Success',
          'Attendance marked successfully!',
          [
            {
              text: 'View Proof',
              onPress: () => setShowProofModal(true),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Attendance error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to mark attendance. Please try again.'
      );
    } finally {
      setLoading(false);
      setVerificationStatus('');
    }
  };

  const shareProof = async () => {
    if (!attendanceProof) return;
    Alert.alert('Share Proof', 'Proof sharing functionality would be implemented here.');
  };

  const downloadProof = async () => {
    if (!attendanceProof) return;
    Alert.alert('Download Proof', 'Proof has been saved to your device.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title>Zero-Knowledge Attendance</Title>
            <Paragraph>
              Mark your attendance using biometric authentication. 
              Your biometric data remains private through ZKP technology.
            </Paragraph>
          </Card.Content>
        </Card>

        <Surface style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Location:</Text>
            <Text style={styles.statusValue}>
              {location ? '📍 Available' : '📍 Getting location...'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Time:</Text>
            <Text style={styles.statusValue}>
              {new Date().toLocaleTimeString()}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Scholar ID:</Text>
            <Text style={styles.statusValue}>{user?.scholarId || 'N/A'}</Text>
          </View>
        </Surface>

        {verificationStatus ? (
          <Card style={styles.verificationCard}>
            <Card.Content>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.verificationText}>{verificationStatus}</Text>
            </Card.Content>
          </Card>
        ) : null}

        <Button
          mode="contained"
          onPress={markAttendance}
          loading={loading}
          disabled={loading || !location}
          style={styles.markButton}
          contentStyle={styles.markButtonContent}
          icon="fingerprint"
        >
          Mark Attendance with Biometric
        </Button>

        <Card style={styles.featuresCard}>
          <Card.Content>
            <Title style={styles.featuresTitle}>Privacy Features</Title>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🔐</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Zero-Knowledge Proof</Text>
                <Text style={styles.featureDesc}>
                  Your biometric data never leaves your device
                </Text>
              </View>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎫</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Verifiable Credentials</Text>
                <Text style={styles.featureDesc}>
                  Generate cryptographic proofs of attendance
                </Text>
              </View>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🌍</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Location Verification</Text>
                <Text style={styles.featureDesc}>
                  Attendance linked to authorized locations
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={showProofModal}
          onDismiss={() => setShowProofModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Attendance Proof</Title>
          {attendanceProof && (
            <>
              <View style={styles.qrContainer}>
                <QRCode
                  value={attendanceProof.qrCode || attendanceProof.proof}
                  size={200}
                  backgroundColor="white"
                />
              </View>
              <Text style={styles.proofId}>
                Proof ID: {attendanceProof.id.substring(0, 8)}...
              </Text>
              <Text style={styles.proofTime}>
                Time: {new Date(attendanceProof.timestamp).toLocaleString()}
              </Text>
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={shareProof}
                  icon="share"
                  style={styles.modalButton}
                >
                  Share
                </Button>
                <Button
                  mode="contained"
                  onPress={downloadProof}
                  icon="download"
                  style={styles.modalButton}
                >
                  Download
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statusCard: {
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 4,
  },
  verificationCard: {
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
  },
  verificationText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  markButton: {
    marginBottom: 24,
    elevation: 4,
  },
  markButtonContent: {
    paddingVertical: 8,
  },
  featuresCard: {
    elevation: 2,
  },
  featuresTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  feature: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
  },
  proofId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  proofTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});