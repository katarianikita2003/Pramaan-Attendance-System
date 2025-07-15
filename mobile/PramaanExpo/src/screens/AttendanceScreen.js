// mobile/PramaanExpo/src/screens/AttendanceScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  List,
  Divider,
  Surface,
  Text,
  IconButton,
  Modal,
  Portal,
  Provider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { useAuth } from '../contexts/AuthContext';
import biometricService from '../services/biometricService';
import attendanceService from '../services/attendanceService';
import api from '../services/api';

const AttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState(0);
  const [capturedFace, setCapturedFace] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await checkBiometricEnrollment();
    await checkTodayAttendance();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkBiometricEnrollment();
    await checkTodayAttendance();
    setRefreshing(false);
  }, []);

  const checkBiometricEnrollment = async () => {
    try {
      setCheckingEnrollment(true);
      
      // Check with backend
      const response = await api.get(`/biometric/check-enrollment/${encodeURIComponent(user.scholarId)}`);
      
      console.log('Enrollment check response:', response.data);
      
      if (response.data) {
        setBiometricEnrolled(response.data.enrolled || false);
        
        // Show enrollment modal if not enrolled
        if (!response.data.enrolled) {
          setShowEnrollModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      setBiometricEnrolled(false);
      setShowEnrollModal(true);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      console.log('Today attendance response:', response);
      
      if (response && response.attendance) {
        setTodayAttendance(response.attendance);
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error checking today attendance:', error);
      setTodayAttendance(null);
    }
  };

  const handleBiometricEnrollment = async () => {
    try {
      setLoading(true);
      setEnrollmentStep(1); // Face capture

      // Step 1: Capture face
      console.log('Starting face capture...');
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

      // Step 3: Create enrollment data
      const formData = new FormData();
      formData.append('scholarId', user.scholarId);
      formData.append('fingerprintData', JSON.stringify({
        type: 'fingerprint',
        timestamp: new Date().toISOString(),
        hash: fingerprintAuth.hash || 'simulated-hash',
      }));

      // Add face image to form data
      formData.append('faceImage', {
        uri: faceImage.uri,
        type: 'image/jpeg',
        name: 'face.jpg',
      });

      console.log('Sending enrollment data to backend...');

      // Step 4: Send to backend
      const response = await api.post('/biometric/enroll', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for enrollment
      });

      console.log('Enrollment response:', response.data);

      if (response.data.success) {
        // Update enrollment status
        setBiometricEnrolled(true);
        setShowEnrollModal(false);
        
        Alert.alert(
          'Success',
          'Biometric enrollment completed successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to enroll biometric');
      }
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to complete biometric enrollment';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setEnrollmentStep(0);
      setCapturedFace(null);
    }
  };

  const handleMarkAttendance = async (type = 'checkIn') => {
    try {
      setLoading(true);

      // Step 1: Authenticate with fingerprint
      console.log('Starting fingerprint authentication for attendance...');
      const fingerprintAuth = await biometricService.authenticateWithFingerprint();
      
      if (!fingerprintAuth.success) {
        Alert.alert('Error', 'Fingerprint authentication failed');
        setLoading(false);
        return;
      }

      // Step 2: Generate attendance proof
      console.log('Generating attendance proof for scholar:', user.scholarId);
      const attendanceProof = await biometricService.generateAttendanceProof(
        user.scholarId,
        fingerprintAuth
      );
      
      console.log('Attendance proof generated successfully');

      // Step 3: Mark attendance with location
      const result = await attendanceService.markAttendance(
        user.scholarId,
        attendanceProof
      );

      console.log('Attendance marking result:', result);

      if (result.success) {
        // Refresh attendance status
        await checkTodayAttendance();
        
        Alert.alert(
          'Success',
          `${type === 'checkIn' ? 'Check-in' : 'Check-out'} marked successfully!`,
          [
            {
              text: 'View Proof',
              onPress: () => {
                Alert.alert(
                  'Attendance Proof',
                  `Proof ID: ${result.attendance.proofId || 'N/A'}\n` +
                  `Time: ${new Date().toLocaleString()}\n` +
                  `Location: Verified ✓\n` +
                  `Biometric: Verified ✓`,
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'OK',
              onPress: () => checkTodayAttendance()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to mark attendance';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderEnrollmentModal = () => (
    <Portal>
      <Modal
        visible={showEnrollModal}
        onDismiss={() => !loading && setShowEnrollModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Title style={styles.modalTitle}>Biometric Enrollment Required</Title>
          
          {enrollmentStep === 0 && (
            <>
              <Paragraph style={styles.modalText}>
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

  if (checkingEnrollment) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Checking enrollment status...</Text>
      </View>
    );
  }

  return (
    <Provider>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View>
                <Title>Today's Attendance</Title>
                <Paragraph>{new Date().toDateString()}</Paragraph>
              </View>
              <IconButton
                icon="refresh"
                onPress={onRefresh}
                disabled={refreshing}
              />
            </View>

            {!biometricEnrolled && (
              <Surface style={styles.warningBanner}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
                <Text style={styles.warningText}>
                  Biometric enrollment required
                </Text>
                <Button
                  mode="text"
                  onPress={() => setShowEnrollModal(true)}
                  compact
                >
                  Enroll Now
                </Button>
              </Surface>
            )}

            {todayAttendance ? (
              <View style={styles.attendanceStatus}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={48}
                  color="#4caf50"
                />
                <Text style={styles.statusText}>
                  {todayAttendance.checkIn ? 'Checked In' : 'Not Checked In'}
                </Text>
                {todayAttendance.checkIn && (
                  <Text style={styles.timeText}>
                    Check-in: {new Date(todayAttendance.checkIn).toLocaleTimeString()}
                  </Text>
                )}
                {todayAttendance.checkOut && (
                  <Text style={styles.timeText}>
                    Check-out: {new Date(todayAttendance.checkOut).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.attendanceStatus}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={48}
                  color="#757575"
                />
                <Text style={styles.statusText}>Not Marked</Text>
                <Paragraph style={styles.helperText}>
                  {biometricEnrolled 
                    ? 'Use your fingerprint to mark attendance' 
                    : 'Please enroll your biometric first'}
                </Paragraph>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => handleMarkAttendance('checkIn')}
                disabled={loading || !biometricEnrolled || todayAttendance?.checkIn}
                loading={loading}
                style={styles.actionButton}
                icon="login"
              >
                Check In
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleMarkAttendance('checkOut')}
                disabled={loading || !biometricEnrolled || !todayAttendance?.checkIn || todayAttendance?.checkOut}
                loading={loading}
                style={styles.actionButton}
                icon="logout"
              >
                Check Out
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Attendance Guidelines</Title>
            <List.Item
              title="Location Required"
              description="You must be within campus boundaries"
              left={props => <List.Icon {...props} icon="map-marker" />}
            />
            <List.Item
              title="Biometric Verification"
              description="Fingerprint required for each attendance"
              left={props => <List.Icon {...props} icon="fingerprint" />}
            />
            <List.Item
              title="Time Restrictions"
              description="Attendance can only be marked during working hours"
              left={props => <List.Icon {...props} icon="clock-outline" />}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.quickActions}>
              <Button
                mode="text"
                onPress={() => navigation.navigate('AttendanceHistory')}
                icon="history"
              >
                View History
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Profile')}
                icon="account"
              >
                Profile
              </Button>
            </View>
          </Card.Content>
        </Card>

        {renderEnrollmentModal()}
      </ScrollView>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe0e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    color: '#d32f2f',
    fontWeight: '500',
  },
  attendanceStatus: {
    alignItems: 'center',
    padding: 24,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  actionButton: {
    flex: 0.45,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    padding: 20,
  },
  modalContent: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  enrollmentSteps: {
    marginBottom: 24,
  },
  enrollButton: {
    marginTop: 16,
  },
  cancelButton: {
    marginTop: 8,
  },
  stepContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loader: {
    marginTop: 24,
  },
  facePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
});

export default AttendanceScreen;

// // mobile/PramaanExpo/src/screens/AttendanceScreen.js
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   View,
//   ScrollView,
//   StyleSheet,
//   Alert,
//   ActivityIndicator,
//   Platform,
//   RefreshControl,
//   Image,
// } from 'react-native';
// import {
//   Card,
//   Title,
//   Paragraph,
//   Button,
//   List,
//   Divider,
//   Surface,
//   Text,
//   IconButton,
//   Modal,
//   Portal,
//   Provider,
// } from 'react-native-paper';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import * as Location from 'expo-location';
// import * as Device from 'expo-device';
// import { useAuth } from '../contexts/AuthContext';
// import biometricService from '../services/biometricService';
// import attendanceService from '../services/attendanceService';
// import api from '../services/api';

// const AttendanceScreen = ({ navigation }) => {
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [checkingEnrollment, setCheckingEnrollment] = useState(true);
//   const [biometricEnrolled, setBiometricEnrolled] = useState(false);
//   const [todayAttendance, setTodayAttendance] = useState(null);
//   const [showEnrollModal, setShowEnrollModal] = useState(false);
//   const [enrollmentStep, setEnrollmentStep] = useState(0);
//   const [capturedFace, setCapturedFace] = useState(null);

//   useEffect(() => {
//     initializeScreen();
//   }, []);

//   const initializeScreen = async () => {
//     await checkBiometricEnrollment();
//     await checkTodayAttendance();
//   };

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await checkBiometricEnrollment();
//     await checkTodayAttendance();
//     setRefreshing(false);
//   }, []);

//   const checkBiometricEnrollment = async () => {
//     try {
//       setCheckingEnrollment(true);
      
//       // Check with backend
//       const response = await api.get(`/biometric/check-enrollment/${encodeURIComponent(user.scholarId)}`);
      
//       console.log('Enrollment check response:', response.data);
      
//       if (response.data) {
//         setBiometricEnrolled(response.data.enrolled || false);
        
//         // Show enrollment modal if not enrolled
//         if (!response.data.enrolled) {
//           setShowEnrollModal(true);
//         }
//       }
//     } catch (error) {
//       console.error('Error checking biometric enrollment:', error);
//       setBiometricEnrolled(false);
//       setShowEnrollModal(true);
//     } finally {
//       setCheckingEnrollment(false);
//     }
//   };

//   const checkTodayAttendance = async () => {
//     try {
//       const response = await attendanceService.getTodayAttendance();
//       console.log('Today attendance response:', response);
      
//       if (response && response.attendance) {
//         setTodayAttendance(response.attendance);
//       } else {
//         setTodayAttendance(null);
//       }
//     } catch (error) {
//       console.error('Error checking today attendance:', error);
//       setTodayAttendance(null);
//     }
//   };

//   const handleBiometricEnrollment = async () => {
//     try {
//       setLoading(true);
//       setEnrollmentStep(1); // Face capture

//       // Step 1: Capture face
//       console.log('Starting face capture...');
//       const faceImage = await biometricService.captureFace();
      
//       if (!faceImage) {
//         Alert.alert('Error', 'Failed to capture face image');
//         setLoading(false);
//         setEnrollmentStep(0);
//         return;
//       }

//       setCapturedFace(faceImage);
//       setEnrollmentStep(2); // Fingerprint capture

//       // Step 2: Authenticate with fingerprint
//       console.log('Starting fingerprint authentication...');
//       const fingerprintAuth = await biometricService.authenticateWithFingerprint();
      
//       if (!fingerprintAuth.success) {
//         Alert.alert('Error', 'Fingerprint authentication failed');
//         setLoading(false);
//         setEnrollmentStep(0);
//         setCapturedFace(null);
//         return;
//       }

//       setEnrollmentStep(3); // Processing

//       // Step 3: Create enrollment data
//       const formData = new FormData();
//       formData.append('scholarId', user.scholarId);
//       formData.append('fingerprintData', JSON.stringify({
//         type: 'fingerprint',
//         timestamp: new Date().toISOString(),
//         hash: fingerprintAuth.hash || 'simulated-hash',
//       }));

//       // Add face image to form data
//       formData.append('faceImage', {
//         uri: faceImage.uri,
//         type: 'image/jpeg',
//         name: 'face.jpg',
//       });

//       console.log('Sending enrollment data to backend...');

//       // Step 4: Send to backend
//       const response = await api.post('/biometric/enroll', formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 30000, // 30 second timeout for enrollment
//       });

//       console.log('Enrollment response:', response.data);

//       if (response.data.success) {
//         // Update enrollment status
//         setBiometricEnrolled(true);
//         setShowEnrollModal(false);
        
//         Alert.alert(
//           'Success',
//           'Biometric enrollment completed successfully!',
//           [{ text: 'OK' }]
//         );
//       } else {
//         Alert.alert('Error', response.data.error || 'Failed to enroll biometric');
//       }
//     } catch (error) {
//       console.error('Biometric enrollment error:', error);
//       const errorMessage = error.response?.data?.error || error.message || 'Failed to complete biometric enrollment';
//       Alert.alert('Error', errorMessage);
//     } finally {
//       setLoading(false);
//       setEnrollmentStep(0);
//       setCapturedFace(null);
//     }
//   };

//   const handleMarkAttendance = async (type = 'checkIn') => {
//     try {
//       setLoading(true);

//       // Step 1: Authenticate with fingerprint
//       console.log('Starting fingerprint authentication for attendance...');
//       const fingerprintAuth = await biometricService.authenticateWithFingerprint();
      
//       if (!fingerprintAuth.success) {
//         Alert.alert('Error', 'Fingerprint authentication failed');
//         setLoading(false);
//         return;
//       }

//       // Step 2: Generate attendance proof
//       console.log('Generating attendance proof for scholar:', user.scholarId);
//       const attendanceProof = await biometricService.generateAttendanceProof(
//         user.scholarId,
//         fingerprintAuth
//       );
      
//       console.log('Attendance proof generated successfully');

//       // Step 3: Mark attendance with location
//       const result = await attendanceService.markAttendance(
//         user.scholarId,
//         attendanceProof
//       );

//       console.log('Attendance marking result:', result);

//       if (result.success) {
//         // Refresh attendance status
//         await checkTodayAttendance();
        
//         Alert.alert(
//           'Success',
//           `${type === 'checkIn' ? 'Check-in' : 'Check-out'} marked successfully!`,
//           [
//             {
//               text: 'View Proof',
//               onPress: () => {
//                 Alert.alert(
//                   'Attendance Proof',
//                   `Proof ID: ${result.attendance.proofId || 'N/A'}\n` +
//                   `Time: ${new Date().toLocaleString()}\n` +
//                   `Location: Verified ✓\n` +
//                   `Biometric: Verified ✓`,
//                   [{ text: 'OK' }]
//                 );
//               }
//             },
//             {
//               text: 'OK',
//               onPress: () => checkTodayAttendance()
//             }
//           ]
//         );
//       } else {
//         Alert.alert('Error', result.error || 'Failed to mark attendance');
//       }
//     } catch (error) {
//       console.error('Mark attendance error:', error);
//       const errorMessage = error.response?.data?.error || error.message || 'Failed to mark attendance';
//       Alert.alert('Error', errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderEnrollmentModal = () => (
//     <Portal>
//       <Modal
//         visible={showEnrollModal}
//         onDismiss={() => !loading && setShowEnrollModal(false)}
//         contentContainerStyle={styles.modalContainer}
//       >
//         <Surface style={styles.modalContent}>
//           <Title style={styles.modalTitle}>Biometric Enrollment Required</Title>
          
//           {enrollmentStep === 0 && (
//             <>
//               <Paragraph style={styles.modalText}>
//                 To mark attendance, you need to enroll your biometric data first.
//                 This is a one-time process that ensures secure attendance marking.
//               </Paragraph>
              
//               <View style={styles.enrollmentSteps}>
//                 <List.Item
//                   title="Step 1: Face Recognition"
//                   description="Capture your face for identity verification"
//                   left={props => <List.Icon {...props} icon="face-recognition" />}
//                 />
//                 <List.Item
//                   title="Step 2: Fingerprint"
//                   description="Register your fingerprint for secure authentication"
//                   left={props => <List.Icon {...props} icon="fingerprint" />}
//                 />
//               </View>

//               <Button
//                 mode="contained"
//                 onPress={handleBiometricEnrollment}
//                 loading={loading}
//                 disabled={loading}
//                 style={styles.enrollButton}
//               >
//                 Start Enrollment
//               </Button>
              
//               {!loading && (
//                 <Button
//                   mode="text"
//                   onPress={() => setShowEnrollModal(false)}
//                   style={styles.cancelButton}
//                 >
//                   Cancel
//                 </Button>
//               )}
//             </>
//           )}

//           {enrollmentStep === 1 && (
//             <View style={styles.stepContainer}>
//               <MaterialCommunityIcons name="face-recognition" size={80} color="#6200ea" />
//               <Title>Capturing Face...</Title>
//               <Paragraph>Please position your face in the camera</Paragraph>
//               <ActivityIndicator size="large" color="#6200ea" style={styles.loader} />
//             </View>
//           )}

//           {enrollmentStep === 2 && (
//             <View style={styles.stepContainer}>
//               {capturedFace && (
//                 <Image source={{ uri: capturedFace.uri }} style={styles.facePreview} />
//               )}
//               <MaterialCommunityIcons name="fingerprint" size={80} color="#6200ea" />
//               <Title>Scan Your Fingerprint</Title>
//               <Paragraph>Please place your finger on the sensor</Paragraph>
//             </View>
//           )}

//           {enrollmentStep === 3 && (
//             <View style={styles.stepContainer}>
//               <MaterialCommunityIcons name="shield-check" size={80} color="#4caf50" />
//               <Title>Processing Enrollment...</Title>
//               <Paragraph>Securing your biometric data</Paragraph>
//               <ActivityIndicator size="large" color="#6200ea" style={styles.loader} />
//             </View>
//           )}
//         </Surface>
//       </Modal>
//     </Portal>
//   );

//   if (checkingEnrollment) {
//     return (
//       <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#6200ea" />
//         <Text style={styles.loadingText}>Checking enrollment status...</Text>
//       </View>
//     );
//   }

//   return (
//     <Provider>
//       <ScrollView 
//         style={styles.container}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         <Card style={styles.card}>
//           <Card.Content>
//             <View style={styles.headerRow}>
//               <View>
//                 <Title>Today's Attendance</Title>
//                 <Paragraph>{new Date().toDateString()}</Paragraph>
//               </View>
//               <IconButton
//                 icon="refresh"
//                 onPress={onRefresh}
//                 disabled={refreshing}
//               />
//             </View>

//             {!biometricEnrolled && (
//               <Surface style={styles.warningBanner}>
//                 <MaterialCommunityIcons name="alert-circle" size={24} color="#ff6b6b" />
//                 <Text style={styles.warningText}>
//                   Biometric enrollment required
//                 </Text>
//                 <Button
//                   mode="text"
//                   onPress={() => setShowEnrollModal(true)}
//                   compact
//                 >
//                   Enroll Now
//                 </Button>
//               </Surface>
//             )}

//             {todayAttendance ? (
//               <View style={styles.attendanceStatus}>
//                 <MaterialCommunityIcons
//                   name="check-circle"
//                   size={48}
//                   color="#4caf50"
//                 />
//                 <Text style={styles.statusText}>
//                   {todayAttendance.checkIn ? 'Checked In' : 'Not Checked In'}
//                 </Text>
//                 {todayAttendance.checkIn && (
//                   <Text style={styles.timeText}>
//                     Check-in: {new Date(todayAttendance.checkIn).toLocaleTimeString()}
//                   </Text>
//                 )}
//                 {todayAttendance.checkOut && (
//                   <Text style={styles.timeText}>
//                     Check-out: {new Date(todayAttendance.checkOut).toLocaleTimeString()}
//                   </Text>
//                 )}
//               </View>
//             ) : (
//               <View style={styles.attendanceStatus}>
//                 <MaterialCommunityIcons
//                   name="clock-outline"
//                   size={48}
//                   color="#757575"
//                 />
//                 <Text style={styles.statusText}>Not Marked</Text>
//                 <Paragraph style={styles.helperText}>
//                   {biometricEnrolled 
//                     ? 'Use your fingerprint to mark attendance' 
//                     : 'Please enroll your biometric first'}
//                 </Paragraph>
//               </View>
//             )}

//             <Divider style={styles.divider} />

//             <View style={styles.actionButtons}>
//               <Button
//                 mode="contained"
//                 onPress={() => handleMarkAttendance('checkIn')}
//                 disabled={loading || !biometricEnrolled || todayAttendance?.checkIn}
//                 loading={loading}
//                 style={styles.actionButton}
//                 icon="login"
//               >
//                 Check In
//               </Button>

//               <Button
//                 mode="outlined"
//                 onPress={() => handleMarkAttendance('checkOut')}
//                 disabled={loading || !biometricEnrolled || !todayAttendance?.checkIn || todayAttendance?.checkOut}
//                 loading={loading}
//                 style={styles.actionButton}
//                 icon="logout"
//               >
//                 Check Out
//               </Button>
//             </View>
//           </Card.Content>
//         </Card>

//         <Card style={styles.card}>
//           <Card.Content>
//             <Title>Attendance Guidelines</Title>
//             <List.Item
//               title="Location Required"
//               description="You must be within campus boundaries"
//               left={props => <List.Icon {...props} icon="map-marker" />}
//             />
//             <List.Item
//               title="Biometric Verification"
//               description="Fingerprint required for each attendance"
//               left={props => <List.Icon {...props} icon="fingerprint" />}
//             />
//             <List.Item
//               title="Time Restrictions"
//               description="Attendance can only be marked during working hours"
//               left={props => <List.Icon {...props} icon="clock-outline" />}
//             />
//           </Card.Content>
//         </Card>

//         <Card style={styles.card}>
//           <Card.Content>
//             <Title>Quick Actions</Title>
//             <View style={styles.quickActions}>
//               <Button
//                 mode="text"
//                 onPress={() => navigation.navigate('History')}
//                 icon="history"
//               >
//                 View History
//               </Button>
//               <Button
//                 mode="text"
//                 onPress={() => navigation.navigate('Profile')}
//                 icon="account"
//               >
//                 Profile
//               </Button>
//             </View>
//           </Card.Content>
//         </Card>

//         {renderEnrollmentModal()}
//       </ScrollView>
//     </Provider>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   card: {
//     margin: 16,
//     elevation: 4,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   warningBanner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#ffe0e0',
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 16,
//   },
//   warningText: {
//     flex: 1,
//     marginLeft: 8,
//     color: '#d32f2f',
//     fontWeight: '500',
//   },
//   attendanceStatus: {
//     alignItems: 'center',
//     padding: 24,
//   },
//   statusText: {
//     fontSize: 18,
//     fontWeight: '500',
//     marginTop: 8,
//   },
//   timeText: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 4,
//   },
//   helperText: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 8,
//     textAlign: 'center',
//   },
//   divider: {
//     marginVertical: 16,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     gap: 16,
//   },
//   actionButton: {
//     flex: 0.45,
//   },
//   quickActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 8,
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#666',
//   },
//   modalContainer: {
//     padding: 20,
//   },
//   modalContent: {
//     padding: 24,
//     borderRadius: 12,
//     backgroundColor: 'white',
//     maxWidth: 400,
//     alignSelf: 'center',
//     width: '100%',
//   },
//   modalTitle: {
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   modalText: {
//     textAlign: 'center',
//     marginBottom: 24,
//     lineHeight: 20,
//   },
//   enrollmentSteps: {
//     marginBottom: 24,
//   },
//   enrollButton: {
//     marginTop: 16,
//   },
//   cancelButton: {
//     marginTop: 8,
//   },
//   stepContainer: {
//     alignItems: 'center',
//     padding: 24,
//   },
//   loader: {
//     marginTop: 24,
//   },
//   facePreview: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     marginBottom: 20,
//   },
// });

// export default AttendanceScreen;