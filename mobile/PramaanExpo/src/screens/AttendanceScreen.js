// src/screens/AttendanceScreen.js - Biometric Attendance Marking
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Card,
  Button,
  Text,
  ActivityIndicator,
  ProgressBar,
  Portal,
  Modal,
  Surface,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import biometricService from '../services/biometricService';
import zkpService from '../services/zkpService';
import { attendanceService } from '../services/api';

const { width, height } = Dimensions.get('window');

const AttendanceScreen = ({ navigation }) => {
  const { user, organization } = useAuth();
  const { 
    currentLocation, 
    isWithinBounds, 
    verifyLocationForAttendance,
    organizationBounds,
  } = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState('ready'); // ready, processing, success, error
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(5);
  const [statusMessage, setStatusMessage] = useState('Ready to mark attendance');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [lastAttendance, setLastAttendance] = useState(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeScreen();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    if (currentStep > 0) {
      Animated.timing(progressAnim, {
        toValue: currentStep / totalSteps,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentStep]);

  const initializeScreen = async () => {
    try {
      // Get last attendance record
      const lastRecord = await getLastAttendanceRecord();
      setLastAttendance(lastRecord);

      // Check biometric enrollment
      const enrolled = await biometricService.isBiometricEnrolled();
      if (!enrolled) {
        Alert.alert(
          'Biometric Not Enrolled',
          'Please complete biometric enrollment before marking attendance.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enroll Now', 
              onPress: () => navigation.navigate('BiometricEnrollment'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error initializing screen:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getLastAttendanceRecord = async () => {
    try {
      const response = await attendanceService.getAttendanceHistory({
        limit: 1,
        page: 1,
      });

      if (response.success && response.data.records.length > 0) {
        return response.data.records[0];
      }
      return null;
    } catch (error) {
      console.error('Error getting last attendance:', error);
      return null;
    }
  };

  const handleMarkAttendance = async () => {
    try {
      setIsLoading(true);
      setAttendanceStatus('processing');
      setCurrentStep(0);
      setStatusMessage('Starting attendance process...');

      // Step 1: Verify location
      setCurrentStep(1);
      setStatusMessage('Verifying location...');
      
      const locationResult = await verifyLocationForAttendance();
      if (!locationResult.success) {
        throw new Error(locationResult.error);
      }

      // Step 2: Check enrollment
      setCurrentStep(2);
      setStatusMessage('Checking biometric enrollment...');
      
      const enrolled = await biometricService.isBiometricEnrolled();
      if (!enrolled) {
        throw new Error('Biometric not enrolled. Please complete enrollment first.');
      }

      // Step 3: Biometric authentication
      setCurrentStep(3);
      setStatusMessage('Authenticating biometric...');
      setShowBiometricModal(true);
      
      const authResult = await biometricService.authenticateForAttendance();
      setShowBiometricModal(false);
      
      if (!authResult.success) {
        throw new Error(authResult.error);
      }

      // Step 4: Generate ZKP proof
      setCurrentStep(4);
      setStatusMessage('Generating cryptographic proof...');
      
      const proofResult = await zkpService.generateAttendanceProof({
        biometricData: authResult.proof,
        timestamp: Date.now(),
        location: locationResult.location,
        locationHash: await generateLocationHash(locationResult.location),
        authMethod: authResult.authMethod,
        quality: authResult.proof?.quality || 0.9,
      });

      if (!proofResult.success) {
        throw new Error('Failed to generate attendance proof');
      }

      // Step 5: Submit attendance
      setCurrentStep(5);
      setStatusMessage('Submitting attendance...');
      
      const attendanceSubmission = {
        timestamp: Date.now(),
        location: locationResult.location,
        distance: locationResult.distance,
        proof: proofResult.proof,
        authMethod: authResult.authMethod,
        metadata: {
          deviceInfo: Platform.OS,
          appVersion: '1.0.0',
          locationAccuracy: locationResult.location.accuracy,
        },
      };

      const submitResult = await attendanceService.markAttendance(attendanceSubmission);
      
      if (submitResult.success) {
        setAttendanceStatus('success');
        setStatusMessage('Attendance marked successfully!');
        setAttendanceData({
          ...submitResult.data,
          proof: proofResult.proof,
        });
        
        // Update last attendance
        setLastAttendance(submitResult.data);
        
        // Show success animation
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      } else {
        throw new Error(submitResult.error);
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      setAttendanceStatus('error');
      setStatusMessage(error.message);
      Alert.alert('Attendance Error', error.message);
    } finally {
      setIsLoading(false);
      // Reset after 3 seconds
      setTimeout(() => {
        setAttendanceStatus('ready');
        setCurrentStep(0);
        setStatusMessage('Ready to mark attendance');
        progressAnim.setValue(0);
      }, 3000);
    }
  };

  const generateLocationHash = async (location) => {
    const locationString = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      locationString
    );
  };

  const handleDownloadProof = () => {
    if (attendanceData?.attendanceId) {
      navigation.navigate('ProofDownload', {
        attendanceId: attendanceData.attendanceId,
        proof: attendanceData.proof,
      });
    }
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const getStatusColor = () => {
    switch (attendanceStatus) {
      case 'processing':
        return '#FF9800';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return '#6C63FF';
    }
  };

  const getStatusIcon = () => {
    switch (attendanceStatus) {
      case 'processing':
        return 'hourglass-empty';
      case 'success':
        return 'check-circle';
      case 'error':
        return 'error';
      default:
        return 'fingerprint';
    }
  };

  const renderLocationStatus = () => (
    <Card style={styles.statusCard}>
      <Card.Content>
        <View style={styles.statusHeader}>
          <Icon
            name="location-on"
            size={24}
            color={isWithinBounds ? '#4CAF50' : '#F44336'}
          />
          <Text style={styles.statusTitle}>Location Status</Text>
        </View>
        
        <Text style={[
          styles.statusText,
          { color: isWithinBounds ? '#4CAF50' : '#F44336' }
        ]}>
          {isWithinBounds 
            ? 'Within campus boundaries' 
            : 'Outside campus boundaries'
          }
        </Text>
        
        {currentLocation && (
          <Text style={styles.locationDetails}>
            Accuracy: {Math.round(currentLocation.accuracy)}m
          </Text>
        )}
        
        {!isWithinBounds && (
          <Button
            mode="outlined"
            onPress={() => setShowLocationModal(true)}
            style={styles.statusButton}
          >
            View Location Details
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const renderLastAttendance = () => {
    if (!lastAttendance) return null;

    const date = new Date(lastAttendance.timestamp);
    const isToday = date.toDateString() === new Date().toDateString();

    return (
      <Card style={styles.lastAttendanceCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Icon name="history" size={24} color="#666" />
            <Text style={styles.statusTitle}>Last Attendance</Text>
          </View>
          
          <Text style={styles.lastAttendanceTime}>
            {isToday 
              ? `Today at ${date.toLocaleTimeString()}`
              : date.toLocaleString()
            }
          </Text>
          
          <Text style={styles.lastAttendanceStatus}>
            Status: {lastAttendance.status || 'Verified'}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderAttendanceButton = () => (
    <Animated.View style={[
      styles.attendanceButtonContainer,
      { transform: [{ scale: pulseAnim }] }
    ]}>
      <Surface style={[
        styles.attendanceButton,
        { backgroundColor: getStatusColor() }
      ]}>
        <Button
          mode="contained"
          onPress={handleMarkAttendance}
          disabled={isLoading || !isWithinBounds}
          style={styles.attendanceButtonInner}
          contentStyle={styles.attendanceButtonContent}
          labelStyle={styles.attendanceButtonLabel}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <>
              <Icon name={getStatusIcon()} size={32} color="white" />
              <Text style={styles.attendanceButtonText}>
                {attendanceStatus === 'ready' ? 'Mark Attendance' : statusMessage}
              </Text>
            </>
          )}
        </Button>
      </Surface>
    </Animated.View>
  );

  const renderProgress = () => {
    if (currentStep === 0) return null;

    return (
      <Card style={styles.progressCard}>
        <Card.Content>
          <Text style={styles.progressTitle}>Progress</Text>
          <ProgressBar
            progress={currentStep / totalSteps}
            color="#6C63FF"
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            Step {currentStep} of {totalSteps}: {statusMessage}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderSuccessActions = () => {
    if (attendanceStatus !== 'success') return null;

    return (
      <Card style={styles.successCard}>
        <Card.Content>
          <View style={styles.successHeader}>
            <Icon name="check-circle" size={48} color="#4CAF50" />
            <Text style={styles.successTitle}>Attendance Marked!</Text>
          </View>
          
          <Text style={styles.successMessage}>
            Your attendance has been recorded with cryptographic proof.
          </Text>
          
          <View style={styles.successActions}>
            <Button
              mode="outlined"
              onPress={handleDownloadProof}
              style={styles.successButton}
              icon="download"
            >
              Download Proof
            </Button>
            
            <Button
              mode="outlined"
              onPress={handleViewHistory}
              style={styles.successButton}
              icon="history"
            >
              View History
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>
            Secure biometric attendance marking
          </Text>
        </View>

        {/* Location Status */}
        {renderLocationStatus()}

        {/* Last Attendance */}
        {renderLastAttendance()}

        {/* Progress */}
        {renderProgress()}

        {/* Attendance Button */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderAttendanceButton()}
        </Animated.View>

        {/* Success Actions */}
        {renderSuccessActions()}

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <Card.Content>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            
            <View style={styles.quickActions}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('History')}
                style={styles.quickActionButton}
                icon="history"
              >
                History
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Profile')}
                style={styles.quickActionButton}
                icon="person"
              >
                Profile
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Location Modal */}
      <Portal>
        <Modal
          visible={showLocationModal}
          onDismiss={() => setShowLocationModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Title
              title="Location Details"
              subtitle="Current location information"
              left={(props) => <Icon {...props} name="location-on" />}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="close"
                  onPress={() => setShowLocationModal(false)}
                />
              )}
            />
            <Card.Content>
              {currentLocation ? (
                <>
                  <Text style={styles.modalText}>
                    Latitude: {currentLocation.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.modalText}>
                    Longitude: {currentLocation.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.modalText}>
                    Accuracy: {Math.round(currentLocation.accuracy)}m
                  </Text>
                  {organizationBounds && (
                    <>
                      <Text style={styles.modalText}>
                        Campus Center: {organizationBounds.center.latitude.toFixed(6)}, 
                        {organizationBounds.center.longitude.toFixed(6)}
                      </Text>
                      <Text style={styles.modalText}>
                        Allowed Radius: {organizationBounds.radius}m
                      </Text>
                    </>
                  )}
                </>
              ) : (
                <Text style={styles.modalText}>
                  Location information not available
                </Text>
              )}
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Biometric Modal */}
      <Portal>
        <Modal
          visible={showBiometricModal}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content style={styles.biometricModalContent}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.biometricModalText}>
                Authenticating biometric...
              </Text>
              <Text style={styles.biometricModalSubtext}>
                Please follow the biometric prompt
              </Text>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
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
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statusCard: {
    margin: 16,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  locationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusButton: {
    marginTop: 8,
  },
  lastAttendanceCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  lastAttendanceTime: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  lastAttendanceStatus: {
    fontSize: 14,
    color: '#666',
  },
  progressCard: {
    margin: 16,
    elevation: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  attendanceButtonContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  attendanceButton: {
    borderRadius: 80,
    elevation: 8,
  },
  attendanceButtonInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  attendanceButtonContent: {
    width: 160,
    height: 160,
    borderRadius: 80,
    flexDirection: 'column',
  },
  attendanceButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendanceButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  successCard: {
    margin: 16,
    elevation: 4,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  successButton: {
    flex: 0.45,
  },
  quickActionsCard: {
    margin: 16,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    flex: 0.45,
  },
  modalContainer: {
    margin: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  biometricModalContent: {
    alignItems: 'center',
    padding: 20,
  },
  biometricModalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  biometricModalSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AttendanceScreen;