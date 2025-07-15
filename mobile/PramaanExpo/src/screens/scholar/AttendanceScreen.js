// mobile/PramaanExpo/src/screens/scholar/AttendanceScreen.js
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
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import biometricService from '../../services/biometricService';
import api from '../../services/api';

const AttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [proofData, setProofData] = useState(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [error, setError] = useState('');
  const [attendanceType, setAttendanceType] = useState('checkIn');
  const [todayStatus, setTodayStatus] = useState(null);

  useEffect(() => {
    checkTodayStatus();
  }, []);

  useEffect(() => {
    let timer;
    if (proofGenerated && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setProofGenerated(false);
            setQrValue('');
            setProofData(null);
            Alert.alert('QR Expired', 'The QR code has expired. Please generate a new one.');
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [proofGenerated, countdown]);

  const checkTodayStatus = async () => {
    try {
      const response = await api.get('/attendance/today-status');
      if (response.data.success) {
        setTodayStatus(response.data.data);
        // Set attendance type based on today's status
        if (!response.data.data.checkIn) {
          setAttendanceType('checkIn');
        } else if (response.data.data.checkIn && !response.data.data.checkOut) {
          setAttendanceType('checkOut');
        }
      }
    } catch (error) {
      console.log('Error checking today status:', error);
    }
  };

  const generateProof = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if already marked
      if (attendanceType === 'checkIn' && todayStatus?.checkIn) {
        Alert.alert('Already Marked', 'Check-in already marked for today');
        return;
      }
      if (attendanceType === 'checkOut' && todayStatus?.checkOut) {
        Alert.alert('Already Marked', 'Check-out already marked for today');
        return;
      }

      // Authenticate with biometric
      const authResult = await biometricService.authenticateWithFingerprint();
      
      if (!authResult.success) {
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      // Get stored biometric data to access nullifier
      const storedBiometricData = await biometricService.getBiometricData(user.scholarId);
      
      if (!storedBiometricData || !storedBiometricData.fingerprintCommitment) {
        throw new Error('No biometric enrollment found. Please enroll first.');
      }

      // Generate biometric proof with proper data structure
      const biometricProof = await biometricService.generateBiometricProof(
        user.scholarId,
        authResult.authenticationType
      );

      // Get device location (optional)
      let location = null;
      try {
        // You can implement location fetching here if needed
        location = {
          coordinates: [0, 0], // Placeholder
          accuracy: 10
        };
      } catch (err) {
        console.log('Location not available');
      }

      // Create biometric data with nullifier for backend
      const biometricData = {
        type: authResult.authenticationType,
        proof: biometricProof.proof,
        publicInputs: biometricProof.publicInputs,
        // Include nullifier from stored commitment
        nullifier: storedBiometricData.fingerprintCommitment.nullifier || 
                  storedBiometricData.faceCommitment?.nullifier ||
                  'temp-nullifier-' + Date.now(), // Fallback
        timestamp: Date.now()
      };

      // Call backend to generate attendance proof
      console.log('Sending proof request with biometric data:', {
        type: biometricData.type,
        hasNullifier: !!biometricData.nullifier,
        hasProof: !!biometricData.proof
      });
      
      const response = await api.post('/attendance/generate-proof', {
        biometricData,
        location,
        attendanceType,
        deviceInfo: {
          platform: 'mobile',
          os: 'android/ios'
        }
      });

      if (response.data.success) {
        const { qrCode, proofId, expiresAt, attendanceId } = response.data.data;
        
        setProofData({
          proofId,
          attendanceId,
          type: attendanceType
        });
        
        setQrValue(qrCode);
        setProofGenerated(true);
        
        // Calculate countdown from expiry time
        const expiryTime = new Date(expiresAt);
        const now = new Date();
        const diffInSeconds = Math.floor((expiryTime - now) / 1000);
        setCountdown(diffInSeconds > 0 ? diffInSeconds : 300);

        // Refresh today's status
        await checkTodayStatus();
      }
    } catch (error) {
      console.error('Generate proof error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to generate proof');
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to generate attendance proof'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetQR = () => {
    setProofGenerated(false);
    setQrValue('');
    setProofData(null);
    setCountdown(300);
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Today's Status Card */}
        {todayStatus && (
          <Card style={styles.statusCard}>
            <Card.Content>
              <Text style={styles.statusTitle}>Today's Attendance</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Icon 
                    name="login" 
                    size={24} 
                    color={todayStatus.checkIn ? "#4CAF50" : "#9E9E9E"} 
                  />
                  <Text style={styles.statusLabel}>Check-in</Text>
                  <Text style={styles.statusTime}>
                    {todayStatus.checkIn ? 
                      new Date(todayStatus.checkIn.time).toLocaleTimeString() : 
                      '--:--'
                    }
                  </Text>
                </View>
                <View style={styles.statusItem}>
                  <Icon 
                    name="logout" 
                    size={24} 
                    color={todayStatus.checkOut ? "#4CAF50" : "#9E9E9E"} 
                  />
                  <Text style={styles.statusLabel}>Check-out</Text>
                  <Text style={styles.statusTime}>
                    {todayStatus.checkOut ? 
                      new Date(todayStatus.checkOut.time).toLocaleTimeString() : 
                      '--:--'
                    }
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {!proofGenerated ? (
          <>
            {/* Attendance Type Selection */}
            <Card style={styles.selectionCard}>
              <Card.Content>
                <Text style={styles.selectionTitle}>Select Attendance Type</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      attendanceType === 'checkIn' && styles.typeButtonActive,
                      todayStatus?.checkIn && styles.typeButtonDisabled
                    ]}
                    onPress={() => !todayStatus?.checkIn && setAttendanceType('checkIn')}
                    disabled={todayStatus?.checkIn}
                  >
                    <Icon 
                      name="login" 
                      size={24} 
                      color={attendanceType === 'checkIn' ? "#fff" : "#6C63FF"} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      attendanceType === 'checkIn' && styles.typeButtonTextActive
                    ]}>
                      Check In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      attendanceType === 'checkOut' && styles.typeButtonActive,
                      (!todayStatus?.checkIn || todayStatus?.checkOut) && styles.typeButtonDisabled
                    ]}
                    onPress={() => todayStatus?.checkIn && !todayStatus?.checkOut && setAttendanceType('checkOut')}
                    disabled={!todayStatus?.checkIn || todayStatus?.checkOut}
                  >
                    <Icon 
                      name="logout" 
                      size={24} 
                      color={attendanceType === 'checkOut' ? "#fff" : "#6C63FF"} 
                    />
                    <Text style={[
                      styles.typeButtonText,
                      attendanceType === 'checkOut' && styles.typeButtonTextActive
                    ]}>
                      Check Out
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>

            {/* Instructions Card */}
            <Card style={styles.instructionCard}>
              <Card.Content>
                <Text style={styles.instructionTitle}>Instructions</Text>
                <View style={styles.instructionItem}>
                  <Icon name="fingerprint" size={20} color="#6C63FF" />
                  <Text style={styles.instructionText}>
                    Authenticate with your fingerprint
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Icon name="qr-code" size={20} color="#6C63FF" />
                  <Text style={styles.instructionText}>
                    Generate QR code for attendance
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Icon name="timer" size={20} color="#6C63FF" />
                  <Text style={styles.instructionText}>
                    QR code expires in 5 minutes
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Icon name="verified-user" size={20} color="#6C63FF" />
                  <Text style={styles.instructionText}>
                    Show QR to admin for verification
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Button
              mode="contained"
              onPress={generateProof}
              loading={loading}
              disabled={loading || (attendanceType === 'checkOut' && !todayStatus?.checkIn)}
              style={styles.generateButton}
              contentStyle={styles.generateButtonContent}
            >
              Generate {attendanceType === 'checkIn' ? 'Check-In' : 'Check-Out'} QR
            </Button>
          </>
        ) : (
          <>
            {/* QR Code Display */}
            <Card style={styles.qrCard}>
              <Card.Content style={styles.qrContent}>
                <Text style={styles.qrTitle}>
                  {attendanceType === 'checkIn' ? 'Check-In' : 'Check-Out'} QR Code
                </Text>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrValue}
                    size={250}
                    color="#000"
                    backgroundColor="#fff"
                  />
                </View>
                <View style={styles.timerContainer}>
                  <Icon name="timer" size={20} color="#FF5252" />
                  <Text style={styles.timerText}>
                    Expires in: {formatTime(countdown)}
                  </Text>
                </View>
                <Text style={styles.proofId}>
                  Proof ID: {proofData?.proofId?.slice(-8) || 'N/A'}
                </Text>
              </Card.Content>
            </Card>

            <View style={styles.qrInstructions}>
              <Icon name="info" size={20} color="#666" />
              <Text style={styles.qrInstructionText}>
                Show this QR code to your admin for verification
              </Text>
            </View>

            <Button
              mode="outlined"
              onPress={resetQR}
              style={styles.resetButton}
            >
              Generate New QR
            </Button>
          </>
        )}
      </ScrollView>
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
  statusCard: {
    margin: 15,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  selectionCard: {
    margin: 15,
    elevation: 2,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6C63FF',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  typeButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  instructionCard: {
    margin: 15,
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  generateButton: {
    marginHorizontal: 15,
    marginTop: 10,
    backgroundColor: '#6C63FF',
  },
  generateButtonContent: {
    paddingVertical: 8,
  },
  qrCard: {
    margin: 15,
    elevation: 4,
  },
  qrContent: {
    alignItems: 'center',
    padding: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: {
    fontSize: 16,
    color: '#FF5252',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  proofId: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
  qrInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
  },
  qrInstructionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  resetButton: {
    marginHorizontal: 15,
    marginTop: 15,
    borderColor: '#6C63FF',
  },
});

export default AttendanceScreen;