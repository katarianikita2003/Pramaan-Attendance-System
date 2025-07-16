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
  Platform,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import biometricService from '../../services/biometricService';
import api from '../../services/api';
import * as Location from 'expo-location';
import * as Device from 'expo-device';

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
  const [checkingStatus, setCheckingStatus] = useState(true);

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
      setCheckingStatus(true);
      const response = await api.get('/attendance/today-status');
      console.log('Today status response:', response.data);

      if (response.data && response.data.success) {
        // Handle the response format from enhanced controller
        const { attendance, hasCheckedIn, hasCheckedOut } = response.data;
        
        const statusData = {
          checkIn: attendance?.checkIn ? {
            time: attendance.checkIn,
            proofId: attendance.checkInProofId
          } : null,
          checkOut: attendance?.checkOut ? {
            time: attendance.checkOut,
            proofId: attendance.checkOutProofId
          } : null,
          status: attendance?.status || 'absent',
          hasCheckedIn,
          hasCheckedOut
        };

        setTodayStatus(statusData);

        // Set attendance type based on today's status
        if (!hasCheckedIn) {
          setAttendanceType('checkIn');
        } else if (hasCheckedIn && !hasCheckedOut) {
          setAttendanceType('checkOut');
        }
      }
    } catch (error) {
      console.error('Error checking today status:', error);
      // If it's a 404, it means no attendance today
      if (error.response?.status === 404) {
        setTodayStatus({
          checkIn: null,
          checkOut: null,
          status: 'absent',
          hasCheckedIn: false,
          hasCheckedOut: false
        });
        setAttendanceType('checkIn');
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for attendance');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const generateProof = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if already marked
      if (attendanceType === 'checkIn' && todayStatus?.hasCheckedIn) {
        Alert.alert('Already Marked', 'Check-in already marked for today');
        return;
      }
      if (attendanceType === 'checkOut' && todayStatus?.hasCheckedOut) {
        Alert.alert('Already Marked', 'Check-out already marked for today');
        return;
      }

      // Get location first
      const location = await getCurrentLocation();
      if (!location) {
        // Location is optional, so we can continue without it
        console.log('Proceeding without location data');
      }

      // Authenticate with biometric (preferably fingerprint)
      console.log(`Starting biometric authentication for ${user.scholarId}`);
      const authResult = await biometricService.authenticateWithFingerprint();

      if (!authResult.success) {
        throw new Error(authResult.error || 'Biometric authentication failed');
      }

      // Generate biometric proof
      console.log(`Generating biometric proof for: ${user.scholarId} ${authResult.authenticationType || 'fingerprint'}`);
      const biometricProof = await biometricService.generateBiometricProof(
        user.scholarId,
        authResult.authenticationType || 'fingerprint'
      );

      if (!biometricProof || !biometricProof.proof || !biometricProof.nullifier) {
        throw new Error('Failed to generate biometric proof. Please ensure you have enrolled your biometrics.');
      }

      console.log('Biometric proof generated successfully');

      // Prepare the request data - CRITICAL: Use biometricData field name
      const proofRequestData = {
        attendanceType,
        biometricData: {  // CHANGED FROM biometricProof TO biometricData
          type: authResult.authenticationType || 'fingerprint',
          proof: biometricProof.proof,
          nullifier: biometricProof.nullifier,
          commitment: biometricProof.commitment,
          timestamp: Date.now()
        },
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        } : null,
        deviceInfo: {
          deviceId: Device.osInternalBuildId || 'unknown',
          deviceModel: Device.modelName || 'unknown',
          osVersion: Device.osVersion || 'unknown',
          platform: Platform.OS
        }
      };

      console.log('Sending proof request with biometric data:', {
        type: proofRequestData.biometricData.type,
        hasProof: !!proofRequestData.biometricData.proof,
        hasNullifier: !!proofRequestData.biometricData.nullifier
      });

      // Call backend to generate attendance proof
      const response = await api.post('/attendance/generate-proof', proofRequestData);

      if (response.data.success && response.data.qrData) {
        const { qrData, proofId, expiresAt, pendingAttendanceId } = response.data;

        setProofData({
          proofId,
          attendanceId: pendingAttendanceId,
          type: attendanceType
        });

        setQrValue(qrData);
        setProofGenerated(true);

        // Calculate countdown from expiry time
        const expiryTime = new Date(expiresAt);
        const now = new Date();
        const diffInSeconds = Math.floor((expiryTime - now) / 1000);
        setCountdown(diffInSeconds > 0 ? diffInSeconds : 300);

        // Don't refresh status immediately - wait for admin verification
        Alert.alert(
          'Success', 
          'QR code generated! Show this to your admin to complete attendance marking.'
        );
      }
    } catch (error) {
      console.error('Generate proof error:', error);
      
      // Handle specific error codes
      if (error.response?.data?.code === 'BIOMETRIC_NOT_ENROLLED') {
        Alert.alert(
          'Biometric Not Enrolled',
          'Please complete biometric enrollment (both fingerprint and face) before marking attendance.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enroll Now', onPress: () => navigation.navigate('BiometricEnrollment') }
          ]
        );
      } else if (error.response?.data?.code === 'ALREADY_MARKED') {
        Alert.alert('Already Marked', error.response.data.error);
        await checkTodayStatus(); // Refresh status
      } else if (error.response?.data?.code === 'NO_CHECKIN_FOUND') {
        Alert.alert('Check-in Required', 'Please check-in first before attempting to check-out');
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.error || error.message || 'Failed to generate attendance proof'
        );
      }
      
      setError(error.response?.data?.error || error.message || 'Failed to generate proof');
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
    Alert.alert(
      'Generate New QR?',
      'This will invalidate the current QR code. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate New',
          onPress: () => {
            setProofGenerated(false);
            setQrValue('');
            setProofData(null);
            setCountdown(300);
            setError('');
            checkTodayStatus(); // Refresh status
          }
        }
      ]
    );
  };

  if (checkingStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Checking attendance status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <TouchableOpacity onPress={checkTodayStatus}>
            <Icon name="refresh" size={24} color="#333" />
          </TouchableOpacity>
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
                    color={todayStatus.hasCheckedIn ? "#4CAF50" : "#9E9E9E"}
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
                    color={todayStatus.hasCheckedOut ? "#4CAF50" : "#9E9E9E"}
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
                      todayStatus?.hasCheckedIn && styles.typeButtonDisabled
                    ]}
                    onPress={() => !todayStatus?.hasCheckedIn && setAttendanceType('checkIn')}
                    disabled={todayStatus?.hasCheckedIn}
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
                      (!todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut) && styles.typeButtonDisabled
                    ]}
                    onPress={() => todayStatus?.hasCheckedIn && !todayStatus?.hasCheckedOut && setAttendanceType('checkOut')}
                    disabled={!todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut}
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
              disabled={loading || (attendanceType === 'checkOut' && !todayStatus?.hasCheckedIn)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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