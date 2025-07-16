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
  Image,
  Modal,
} from 'react-native';
import { Card, Button, Portal, Surface, Title, Paragraph, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
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

  // Biometric enrollment states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState(0);
  const [capturedFace, setCapturedFace] = useState(null);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);

  useEffect(() => {
    checkTodayStatus();
    checkBiometricEnrollment();
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

  const checkBiometricEnrollment = async () => {
    try {
      setCheckingEnrollment(true);
      console.log('Checking biometric enrollment status for:', user.scholarId);

      // First check local enrollment status
      const localEnrolled = await biometricService.isBiometricEnrolled(user.scholarId);
      console.log('Local enrollment status:', localEnrolled);

      // Then verify with backend
      const response = await api.get('/biometric/status');
      console.log('Backend enrollment status:', response.data);

      if (response.data.success) {
        // FIX: Check the correct path in the response
        const isEnrolled = response.data.enrollmentStatus?.isEnrolled ||
          response.data.isEnrolled ||
          (response.data.enrollmentStatus?.hasFingerprint &&
            response.data.enrollmentStatus?.hasFace) ||
          (response.data.hasFingerprint && response.data.hasFace);

        console.log('Parsed enrollment status:', isEnrolled);
        setBiometricEnrolled(isEnrolled);

        // Sync local status with backend
        if (isEnrolled !== localEnrolled) {
          await biometricService.saveBiometricEnrollment(user.scholarId, isEnrolled);
        }
      }
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      // Default to local status if backend check fails
      const localEnrolled = await biometricService.isBiometricEnrolled(user.scholarId);
      setBiometricEnrolled(localEnrolled);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handleBiometricEnrollment = async () => {
    try {
      setLoading(true);
      setEnrollmentStep(1); // Face capture

      // Step 1: Capture face image
      console.log('Capturing face image...');
      const faceImage = await biometricService.captureFace();

      if (!faceImage) {
        Alert.alert('Error', 'Failed to capture face image');
        setLoading(false);
        setEnrollmentStep(0);
        return;
      }

      setCapturedFace(faceImage);
      setEnrollmentStep(2); // Fingerprint capture

      // Step 2: Authenticate with fingerprint
      console.log('Starting fingerprint authentication...');
      const fingerprintAuth = await biometricService.authenticateWithFingerprint();

      if (!fingerprintAuth.success) {
        Alert.alert('Error', 'Fingerprint authentication failed');
        setLoading(false);
        setEnrollmentStep(0);
        setCapturedFace(null);
        return;
      }

      setEnrollmentStep(3); // Processing

      // Step 3: Generate biometric commitments
      console.log('Generating biometric commitments...');
      const faceCommitment = await biometricService.generateBiometricCommitment({
        uri: faceImage.uri,
        base64: faceImage.base64,
        type: 'face'
      });

      const fingerprintCommitment = await biometricService.generateBiometricCommitment({
        data: fingerprintAuth.data || fingerprintAuth.hash,
        type: 'fingerprint'
      });

      // Step 4: Save biometric data locally first
      const biometricData = {
        faceCommitment: faceCommitment,
        fingerprintCommitment: fingerprintCommitment,
        enrolledAt: new Date().toISOString()
      };

      await biometricService.storeBiometricData(user.scholarId, biometricData);
      console.log('Biometric data saved locally for scholar:', user.scholarId);

      // Step 5: Send enrollment data to backend
      console.log('Sending enrollment to backend...');

      // Create the enrollment data that backend expects
      const enrollmentData = {
        type: 'fingerprint', // Required by backend
        biometricData: {
          faceCommitment: faceCommitment.commitment,
          fingerprintCommitment: fingerprintCommitment.commitment,
          faceTemplate: faceCommitment.commitment,
          fingerprintTemplate: fingerprintCommitment.commitment
        }
      };

      console.log('Enrollment data:', {
        type: enrollmentData.type,
        hasFace: !!enrollmentData.biometricData.faceCommitment,
        hasFingerprint: !!enrollmentData.biometricData.fingerprintCommitment
      });

      // Call the backend enrollment endpoint
      const response = await api.post('/biometric/enroll', enrollmentData, {
        timeout: 30000,
      });

      console.log('Enrollment response:', response.data);

      if (response.data.success) {
        // CRITICAL: Update the local enrollment status FIRST
        await biometricService.saveBiometricEnrollment(user.scholarId, true);

        // Then update the component state
        setBiometricEnrolled(true);
        setShowEnrollModal(false);

        // Reset enrollment steps
        setEnrollmentStep(0);
        setCapturedFace(null);

        Alert.alert(
          'Success',
          'Biometric enrollment completed successfully! You can now mark attendance.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Force refresh enrollment status from backend
                await checkBiometricEnrollment();
              }
            }
          ]
        );
      } else {
        throw new Error(response.data.error || 'Enrollment failed');
      }

    } catch (error) {
      console.error('Biometric enrollment error:', error);

      // Reset states
      setEnrollmentStep(0);
      setCapturedFace(null);
      setLoading(false);

      // Show specific error message
      let errorMessage = 'Failed to complete biometric enrollment. ';
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }

      Alert.alert('Enrollment Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

      // CRITICAL FIX: Handle the response format correctly
      if (response.data.success && response.data.qrData) {
        const { qrData, proofId, expiresAt, pendingAttendanceId, attendanceType: returnedType } = response.data;

        setProofData({
          proofId,
          attendanceId: pendingAttendanceId,
          type: returnedType || attendanceType
        });

        // CRITICAL: Set the base64 QR data directly
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
            { text: 'Enroll Now', onPress: () => setShowEnrollModal(true) }
          ]
        );
      } else if (error.response?.data?.code === 'ATTENDANCE_ALREADY_MARKED') {
        // Handle attendance already marked
        Alert.alert(
          'Attendance Already Marked',
          error.response.data.error || `${attendanceType === 'checkIn' ? 'Check-in' : 'Check-out'} already marked for today`,
          [
            {
              text: 'OK',
              onPress: async () => {
                // Refresh the status to show the already marked attendance
                await checkTodayStatus();
                setProofGenerated(false);
                setQrValue('');
                setProofData(null);
              }
            }
          ]
        );
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

  // Render attendance status
  const renderAttendanceStatus = () => {
    if (checkingStatus) {
      return (
        <Card style={styles.statusCard}>
          <Card.Content>
            <ActivityIndicator size="small" color="#6200EE" />
            <Text style={styles.statusText}>Checking attendance status...</Text>
          </Card.Content>
        </Card>
      );
    }

    if (todayStatus?.hasCheckedIn || todayStatus?.hasCheckedOut) {
      return (
        <Card style={[styles.statusCard, styles.successCard]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Icon name="check-circle" size={24} color="#4CAF50" />
              <Title style={styles.statusTitleText}>Today's Attendance</Title>
            </View>
            
            {todayStatus.checkIn && (
              <View style={styles.statusRowDetail}>
                <Text style={styles.statusLabelText}>Check-in:</Text>
                <Text style={styles.statusValueText}>
                  {new Date(todayStatus.checkIn.time).toLocaleTimeString()}
                </Text>
              </View>
            )}
            
            {todayStatus.checkOut && (
              <View style={styles.statusRowDetail}>
                <Text style={styles.statusLabelText}>Check-out:</Text>
                <Text style={styles.statusValueText}>
                  {new Date(todayStatus.checkOut.time).toLocaleTimeString()}
                </Text>
              </View>
            )}
            
            {!todayStatus.hasCheckedOut && todayStatus.hasCheckedIn && (
              <Text style={styles.pendingText}>
                You can check out after completing your work day
              </Text>
            )}
          </Card.Content>
        </Card>
      );
    }

    return null;
  };

  // Biometric Enrollment Modal
  const BiometricEnrollmentModal = () => (
    <Portal>
      <Modal
        visible={showEnrollModal}
        onDismiss={() => !loading && setShowEnrollModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          {enrollmentStep === 0 && (
            <>
              <Title style={styles.modalTitle}>Biometric Enrollment Required</Title>
              <Paragraph style={styles.modalDescription}>
                To mark attendance, you need to enroll your biometric data first.
                This is a one-time process that ensures secure attendance marking.
              </Paragraph>

              <View style={styles.enrollmentSteps}>
                <List.Item
                  title="Step 1: Face Recognition"
                  description="Capture your face for identity verification"
                  left={props => <List.Icon {...props} icon="face-recognition" />}
                />
                <List.Item
                  title="Step 2: Fingerprint"
                  description="Register your fingerprint for secure authentication"
                  left={props => <List.Icon {...props} icon="fingerprint" />}
                />
              </View>

              <Button
                mode="contained"
                onPress={handleBiometricEnrollment}
                loading={loading}
                disabled={loading}
                style={styles.enrollButton}
              >
                Start Enrollment
              </Button>

              {!loading && (
                <Button
                  mode="text"
                  onPress={() => setShowEnrollModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              )}
            </>
          )}

          {enrollmentStep === 1 && (
            <View style={styles.stepContainer}>
              <MaterialCommunityIcons name="face-recognition" size={80} color="#6200ea" />
              <Title>Capturing Face...</Title>
              <Paragraph>Please position your face in the camera</Paragraph>
              <ActivityIndicator size="large" color="#6200ea" style={styles.loader} />
            </View>
          )}

          {enrollmentStep === 2 && (
            <View style={styles.stepContainer}>
              {capturedFace && (
                <Image source={{ uri: capturedFace.uri }} style={styles.facePreview} />
              )}
              <MaterialCommunityIcons name="fingerprint" size={80} color="#6200ea" />
              <Title>Scan Your Fingerprint</Title>
              <Paragraph>Please place your finger on the sensor</Paragraph>
            </View>
          )}

          {enrollmentStep === 3 && (
            <View style={styles.stepContainer}>
              <MaterialCommunityIcons name="shield-check" size={80} color="#4caf50" />
              <Title>Processing Enrollment...</Title>
              <Paragraph>Securing your biometric data</Paragraph>
              <ActivityIndicator size="large" color="#6200ea" style={styles.loader} />
            </View>
          )}
        </Surface>
      </Modal>
    </Portal>
  );

  if (checkingStatus || checkingEnrollment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>
            {checkingStatus ? 'Checking attendance status...' : 'Checking enrollment status...'}
          </Text>
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

        {/* Add the attendance status display here */}
        {renderAttendanceStatus()}

        {/* Biometric Enrollment Status */}
        {!biometricEnrolled && (
          <Card style={[styles.statusCard, styles.warningCard]}>
            <Card.Content>
              <View style={styles.warningContent}>
                <Icon name="warning" size={24} color="#FF9800" />
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>Biometric Not Enrolled</Text>
                  <Text style={styles.warningText}>
                    Please complete biometric enrollment first
                  </Text>
                </View>
                <Button
                  mode="contained"
                  onPress={() => setShowEnrollModal(true)}
                  style={styles.enrollNowButton}
                  compact
                >
                  Enroll Now
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Today's Status Card - Show only if not already rendered above */}
        {todayStatus && !todayStatus.hasCheckedIn && !todayStatus.hasCheckedOut && (
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
              disabled={loading || !biometricEnrolled || (attendanceType === 'checkOut' && !todayStatus?.hasCheckedIn)}
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
                  {qrValue && qrValue.length < 200 ? ( // Check QR data size
                    <QRCode
                      value={qrValue}
                      size={250}
                      backgroundColor="white"
                      color="black"
                      logoSize={50}
                      logoBackgroundColor="white"
                      logoBorderRadius={10}
                      quietZone={10}
                      ecl="M" // Medium error correction level
                    />
                  ) : (
                    <View style={styles.qrErrorContainer}>
                      <Icon name="error" size={50} color="#FF6B6B" />
                      <Text style={styles.qrErrorText}>
                        QR data too large. Please try again.
                      </Text>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          setProofGenerated(false);
                          setQrValue('');
                          generateProof();
                        }}
                        style={styles.retryButton}
                      >
                        Retry
                      </Button>
                    </View>
                  )}
                </View>
                
                {/* Countdown Timer */}
                <View style={styles.timerContainer}>
                  <Icon 
                    name="timer" 
                    size={24} 
                    color={countdown < 60 ? "#FF6B6B" : "#6C63FF"} 
                  />
                  <Text style={[
                    styles.timerText,
                    countdown < 60 && styles.timerTextWarning
                  ]}>
                    Expires in: {formatTime(countdown)}
                  </Text>
                </View>
                
                {/* Proof Details */}
                <View style={styles.proofDetails}>
                  <Text style={styles.proofDetailText}>
                    Proof ID: {proofData?.proofId?.substring(0, 8)}...
                  </Text>
                  <Text style={styles.proofDetailText}>
                    Type: {attendanceType === 'checkIn' ? 'Check-In' : 'Check-Out'}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <View style={styles.qrInstructions}>
              <Icon name="info" size={20} color="#666" />
              <Text style={styles.qrInstructionText}>
                Show this QR code to your admin for verification
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.qrActionButtons}>
              <Button
                mode="outlined"
                onPress={resetQR}
                style={[styles.actionButton, styles.resetButton]}
              >
                Generate New
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  Alert.alert(
                    'Attendance Marked?',
                    'Has the admin scanned your QR code?',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Yes',
                        onPress: () => {
                          setProofGenerated(false);
                          checkTodayStatus();
                          navigation.goBack();
                        }
                      }
                    ]
                  );
                }}
                style={[styles.actionButton, styles.doneButton]}
              >
                Done
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      {/* Biometric Enrollment Modal */}
      <BiometricEnrollmentModal />
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
  successCard: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitleText: {
    marginLeft: 8,
    fontSize: 18,
    color: '#4CAF50',
  },
  statusRowDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statusLabelText: {
    fontSize: 14,
    color: '#666',
  },
  statusValueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pendingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  statusText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
  },
  warningCard: {
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  enrollNowButton: {
    backgroundColor: '#FF9800',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    minHeight: 270,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  qrErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrErrorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: {
    fontSize: 16,
    color: '#6C63FF',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  timerTextWarning: {
    color: '#FF6B6B',
  },
  proofDetails: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
  },
  proofDetailText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 2,
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
  qrActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  resetButton: {
    borderColor: '#6C63FF',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
  },
  // Modal styles
  modalContainer: {
    padding: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  enrollmentSteps: {
    marginBottom: 20,
  },
  enrollButton: {
    backgroundColor: '#6200ea',
    marginBottom: 10,
  },
  cancelButton: {
    marginTop: 5,
  },
  stepContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    marginTop: 20,
  },
  facePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
});

export default AttendanceScreen;