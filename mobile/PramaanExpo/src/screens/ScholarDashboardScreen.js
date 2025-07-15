// mobile/PramaanExpo/src/screens/ScholarDashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  IconButton,
  useTheme,
  Appbar,
  ActivityIndicator,
  Surface,
  List,
  Divider,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// Date formatting utilities (no external dependencies)
const formatDate = (date) => {
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api'; // Changed from { api } to api
import biometricService from '../services/biometricService';

const ScholarDashboardScreen = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [scholarData, setScholarData] = useState(null);
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    streak: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [profileRes, statsRes, attendanceRes, enrollmentRes, todayRes] = await Promise.all([
        api.get('/scholar/profile'),
        api.get('/scholar/stats'),
        api.get('/scholar/attendance/history?limit=5'),
        api.get(`/biometric/check-enrollment/${user.scholarId}`),
        api.get('/attendance/today'),
      ]);

      setScholarData(profileRes.data.scholar);
      setStats(statsRes.data.stats || {
        presentDays: 0,
        absentDays: 0,
        attendancePercentage: 0,
        streak: 0,
      });
      setRecentAttendance(attendanceRes.data.attendance || []);
      
      console.log('Enrollment check response:', enrollmentRes.data);
      setIsEnrolled(enrollmentRes.data.enrolled || false);
      
      console.log('Today attendance response:', todayRes.data);
      setTodayAttendance(todayRes.data.attendance);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricEnrollment = async () => {
    try {
      setEnrollmentLoading(true);
      console.log('Starting face capture...');
      
      // Step 1: Capture face
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images', // Fixed: Using string directly
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Face captured successfully');
        
        // Step 2: Capture fingerprint
        console.log('Starting fingerprint authentication...');
        const fingerprintResult = await biometricService.captureFingerprint();
        
        if (fingerprintResult.success) {
          console.log('Fingerprint captured successfully');
          
          // Step 3: Generate commitments
          const faceCommitment = await biometricService.generateBiometricCommitment({
            uri: result.assets[0].uri,
            base64: result.assets[0].base64,
          });
          
          const fingerprintCommitment = await biometricService.generateBiometricCommitment({
            data: fingerprintResult.data,
          });
          
          // Step 4: Send to backend with scholarId
          console.log('Sending enrollment data to backend...');
          const enrollmentData = {
            scholarId: user.scholarId, // CRITICAL: Include scholarId
            biometricData: {
              faceImage: result.assets[0].base64,
              fingerprintTemplate: fingerprintResult.data,
              faceCommitment,
              fingerprintCommitment,
            }
          };

          const response = await api.post('/biometric/enroll', enrollmentData);
          
          if (response.data.success) {
            Alert.alert('Success', 'Biometric enrollment completed successfully!');
            setIsEnrolled(true);
            setShowEnrollmentModal(false);
            await loadDashboardData();
          }
        } else {
          Alert.alert('Error', 'Failed to capture fingerprint');
        }
      }
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to enroll biometric');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    try {
      // Check if already marked
      if (todayAttendance?.checkIn) {
        Alert.alert('Info', 'Attendance already marked for today');
        return;
      }

      // Check enrollment
      if (!isEnrolled) {
        Alert.alert(
          'Enrollment Required',
          'You need to enroll your biometric data before marking attendance',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enroll Now', onPress: () => setShowEnrollmentModal(true) }
          ]
        );
        return;
      }

      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission is required');
        return;
      }

      console.log('Starting fingerprint authentication for attendance...');
      const biometricResult = await biometricService.captureFingerprint();
      
      if (biometricResult.success) {
        console.log('Fingerprint authenticated successfully');
        
        const proofData = await biometricService.generateBiometricProof(
          user.scholarId,
          biometricResult.data
        );
        
        console.log('Generating attendance proof for scholar:', user.scholarId);
        console.log('Attendance proof generated successfully');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        console.log('Current location obtained:', location.coords);
        
        const attendanceData = {
          scholarId: user.scholarId,
          biometricProof: proofData.proof,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: new Date().toISOString(),
        };
        
        console.log('Marking attendance with data:', attendanceData);
        
        const response = await api.post('/attendance/mark', attendanceData);
        
        if (response.data.success) {
          console.log('Attendance marking result:', response.data);
          Alert.alert(
            'Success',
            'Attendance marked successfully!',
            [
              {
                text: 'View Proof',
                onPress: () => showAttendanceProof(response.data.attendance),
              },
              { text: 'OK' }
            ]
          );
          await loadDashboardData();
        }
      } else {
        Alert.alert('Error', 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const showAttendanceProof = (attendance) => {
    Alert.alert(
      'Attendance Proof',
      `Proof ID: ${attendance.proofId}\nTime: ${formatDateTime(attendance.markedAt)}\nLocation: Verified ✓\nBiometric: Verified ✓`,
      [{ text: 'OK' }]
    );
  };

  const renderEnrollmentModal = () => (
    <Modal
      visible={showEnrollmentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEnrollmentModal(false)}
    >
      <View style={styles.modalContainer}>
        <Card style={styles.modalCard}>
          <Card.Title
            title="Biometric Enrollment Required"
            subtitle="To mark attendance, you need to enroll your biometric data first. This is a one-time process that ensures secure attendance marking."
          />
          <Card.Content>
            <Text variant="titleMedium" style={styles.modalSectionTitle}>
              Step 1: Face Registration
            </Text>
            <Text variant="bodySmall" style={styles.modalDescription}>
              Capture your face for secure authentication
            </Text>
            
            <Divider style={styles.modalDivider} />
            
            <Text variant="titleMedium" style={styles.modalSectionTitle}>
              Step 2: Fingerprint
            </Text>
            <Text variant="bodySmall" style={styles.modalDescription}>
              Register your fingerprint for secure authentication
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => setShowEnrollmentModal(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleBiometricEnrollment}
              loading={enrollmentLoading}
              disabled={enrollmentLoading}
            >
              Start Enrollment
            </Button>
          </Card.Actions>
        </Card>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const attendanceColor = todayAttendance?.checkIn ? '#4CAF50' : '#f44336';

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Scholar Dashboard" />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={80}
                label={scholarData?.personalInfo?.name?.substring(0, 2).toUpperCase() || 'SC'}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Text variant="headlineSmall" style={styles.name}>
                  {scholarData?.personalInfo?.name || 'Scholar'}
                </Text>
                <Text variant="bodyMedium" style={styles.scholarId}>
                  ID: {user.scholarId}
                </Text>
                <Chip icon="school" style={styles.departmentChip}>
                  {scholarData?.academicInfo?.department || 'N/A'}
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Today's Attendance */}
        <Card style={[styles.card, { borderLeftColor: attendanceColor, borderLeftWidth: 4 }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium">Today's Attendance</Text>
              <Text variant="bodySmall">{formatDate(new Date())}</Text>
            </View>
            
            {!isEnrolled && (
              <Surface style={styles.warningBanner} elevation={1}>
                <IconButton icon="alert-circle" size={20} iconColor="#ff9800" />
                <Text style={styles.warningText}>Biometric enrollment required</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setShowEnrollmentModal(true)}
                >
                  Enroll Now
                </Button>
              </Surface>
            )}
            
            <View style={styles.attendanceStatus}>
              {todayAttendance?.checkIn ? (
                <>
                  <IconButton
                    icon="check-circle"
                    size={48}
                    iconColor="#4CAF50"
                  />
                  <Text variant="bodyLarge" style={styles.statusText}>
                    Checked In
                  </Text>
                  <Text variant="bodySmall">
                    {formatTime(todayAttendance.checkIn)}
                  </Text>
                  {todayAttendance.checkInProofId && (
                    <Text variant="bodySmall" style={styles.proofText}>
                      Proof: {todayAttendance.checkInProofId.substring(0, 8)}...
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <IconButton
                    icon="clock-outline"
                    size={48}
                    iconColor="#666"
                  />
                  <Text variant="bodyLarge" style={styles.statusText}>
                    Not Marked
                  </Text>
                  <Button
                    mode="contained"
                    onPress={handleMarkAttendance}
                    style={styles.markButton}
                    disabled={!isEnrolled}
                  >
                    Mark Attendance
                  </Button>
                </>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Attendance Stats */}
        <Card style={styles.card}>
          <Card.Title title="Attendance Statistics" />
          <Card.Content>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.presentDays || 0}
                </Text>
                <Text variant="bodySmall">Present Days</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.attendancePercentage || 0}%
                </Text>
                <Text variant="bodySmall">Attendance</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.streak || 0}
                </Text>
                <Text variant="bodySmall">Current Streak</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Attendance */}
        <Card style={styles.card}>
          <Card.Title title="Recent Attendance" />
          <Card.Content>
            {recentAttendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records yet</Text>
            ) : (
              <List.Section>
                {recentAttendance.map((record, index) => (
                  <List.Item
                    key={index}
                    title={formatDate(new Date(record.date))}
                    description={`Check-in: ${record.checkIn ? formatTime(record.checkIn) : 'N/A'}`}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon={record.status === 'present' ? 'check-circle' : 'close-circle'}
                        color={record.status === 'present' ? '#4CAF50' : '#f44336'}
                      />
                    )}
                  />
                ))}
              </List.Section>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                icon="history"
                onPress={() => {}}
                style={styles.actionButton}
              >
                View History
              </Button>
              <Button
                mode="outlined"
                icon="account"
                onPress={() => {}}
                style={styles.actionButton}
              >
                Profile
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {renderEnrollmentModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 16,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6200ea',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  scholarId: {
    color: '#666',
    marginTop: 4,
  },
  departmentChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: '#ff6f00',
  },
  attendanceStatus: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusText: {
    marginTop: 8,
    fontWeight: '500',
  },
  proofText: {
    marginTop: 4,
    color: '#666',
  },
  markButton: {
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#6200ea',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
  },
  modalSectionTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  modalDescription: {
    color: '#666',
  },
  modalDivider: {
    marginVertical: 16,
  },
});

export default ScholarDashboardScreen;