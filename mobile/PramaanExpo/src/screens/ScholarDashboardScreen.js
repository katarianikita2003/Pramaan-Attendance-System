// mobile/PramaanExpo/src/screens/ScholarDashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Avatar, Card, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import scholarService from '../services/scholarService';
import biometricService from '../services/biometricService';

const ScholarDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    attendancePercentage: 0,
    currentStreak: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [profileData, statsData, historyData, enrollmentStatus] = await Promise.all([
        scholarService.getProfile(),
        scholarService.getStats(),
        scholarService.getAttendanceHistory(1, 5),
        checkBiometricEnrollment(),
      ]);

      if (profileData.success) {
        setProfile(profileData.scholar);
      }

      if (statsData.success) {
        // Fix: Ensure attendance percentage is a valid number
        const attendancePercentage = parseFloat(statsData.stats?.attendancePercentage || 0);
        setStats({
          ...statsData.stats,
          attendancePercentage: isNaN(attendancePercentage) ? 0 : attendancePercentage,
          totalPresent: statsData.stats?.totalPresent || 0,
          totalAbsent: statsData.stats?.totalAbsent || 0,
          currentStreak: statsData.stats?.currentStreak || 0,
        });
      }

      if (historyData.success) {
        setRecentAttendance(historyData.attendance || []);
      }

      setIsEnrolled(enrollmentStatus);

      // Note: We're not calling /attendance/today anymore as it doesn't exist
      // Check if there's attendance for today in the history
      const today = new Date().toDateString();
      const todayRecord = historyData.attendance?.find(record => 
        new Date(record.createdAt).toDateString() === today
      );
      setTodayAttendance(todayRecord);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkBiometricEnrollment = async () => {
    try {
      const result = await biometricService.checkEnrollment(user.scholarId);
      return result.isEnrolled || false;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleMarkAttendance = () => {
    if (!isEnrolled) {
      Alert.alert(
        'Biometric Enrollment Required',
        'Please enroll your biometrics before marking attendance.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enroll Now', onPress: () => {
            // Check if BiometricEnrollment screen exists in navigation
            if (navigation.getState().routeNames.includes('BiometricEnrollment')) {
              navigation.navigate('BiometricEnrollment');
            } else {
              // Temporary: Show enrollment in an alert
              Alert.alert(
                'Setup Required',
                'BiometricEnrollment screen needs to be added to navigation. For now, biometric enrollment will be simulated.',
                [
                  { 
                    text: 'Simulate Enrollment', 
                    onPress: async () => {
                      // Simulate enrollment for testing
                      const commitment = await biometricService.generateBiometricCommitment({
                        type: 'fingerprint',
                        timestamp: Date.now(),
                      });
                      await biometricService.storeBiometricData(user.scholarId, {
                        fingerprintCommitment: commitment,
                      });
                      await biometricService.saveBiometricEnrollment(user.scholarId, true);
                      Alert.alert('Success', 'Biometric enrollment simulated. You can now mark attendance.');
                      loadDashboardData(); // Refresh the dashboard
                    }
                  },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }
          }}
        ]
      );
      return;
    }
    
    // Navigate to the new attendance screen that uses QR codes
    navigation.navigate('MarkAttendance');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SC';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate safe progress value for ProgressBar
  const getProgressValue = () => {
    const percentage = stats.attendancePercentage || 0;
    const value = percentage / 100;
    
    // Ensure value is between 0 and 1
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }
    
    return Math.min(1, Math.max(0, value));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scholar Dashboard</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Icon name="logout" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={80}
              label={getInitials(profile?.personalInfo?.name)}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.personalInfo?.name || 'Scholar'}</Text>
              <Text style={styles.profileId}>ID: {user?.scholarId || 'N/A'}</Text>
              <Text style={styles.profileDepartment}>
                <Icon name="school" size={16} /> {profile?.academicInfo?.department || 'N/A'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Today's Attendance */}
        <Card style={styles.todayCard}>
          <Card.Title title="Today's Attendance" subtitle={new Date().toDateString()} />
          <Card.Content>
            {!isEnrolled ? (
              <View style={styles.enrollmentWarning}>
                <Icon name="warning" size={24} color="#FF9800" />
                <Text style={styles.warningText}>Biometric enrollment required</Text>
                <TouchableOpacity
                  style={styles.enrollButton}
                  onPress={() => {
                    if (navigation.getState().routeNames.includes('BiometricEnrollment')) {
                      navigation.navigate('BiometricEnrollment');
                    } else {
                      handleMarkAttendance(); // This will show the enrollment alert
                    }
                  }}
                >
                  <Text style={styles.enrollButtonText}>Enroll Now</Text>
                </TouchableOpacity>
              </View>
            ) : todayAttendance ? (
              <View style={styles.attendanceMarked}>
                <Icon name="check-circle" size={40} color="#4CAF50" />
                <Text style={styles.markedText}>Attendance Marked</Text>
                <Text style={styles.markedTime}>
                  {formatDate(todayAttendance.createdAt)}
                </Text>
              </View>
            ) : (
              <View style={styles.attendanceNotMarked}>
                <Icon name="radio-button-unchecked" size={40} color="#9E9E9E" />
                <Text style={styles.notMarkedText}>Not Marked</Text>
                <TouchableOpacity
                  style={styles.markButton}
                  onPress={handleMarkAttendance}
                >
                  <Text style={styles.markButtonText}>Mark Attendance</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Attendance Statistics */}
        <Card style={styles.statsCard}>
          <Card.Title title="Attendance Statistics" />
          <Card.Content>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalPresent || 0}</Text>
                <Text style={styles.statLabel}>Present Days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(stats.attendancePercentage || 0)}%
                </Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.currentStreak || 0}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <ProgressBar
                progress={getProgressValue()}
                color="#6C63FF"
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round(stats.attendancePercentage || 0)}% Complete
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Attendance */}
        <Card style={styles.recentCard}>
          <Card.Title title="Recent Attendance" />
          <Card.Content>
            {recentAttendance.length > 0 ? (
              recentAttendance.map((record, index) => (
                <View key={record._id || index} style={styles.recentItem}>
                  <Icon
                    name={record.status === 'present' ? 'check-circle' : 'cancel'}
                    size={24}
                    color={record.status === 'present' ? '#4CAF50' : '#F44336'}
                  />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentDate}>{formatDate(record.createdAt)}</Text>
                    <Text style={styles.recentStatus}>
                      {record.status === 'present' ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noRecords}>No attendance records yet</Text>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AttendanceHistory')}
          >
            <Icon name="history" size={24} color="#6C63FF" />
            <Text style={styles.actionText}>View History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person" size={24} color="#6C63FF" />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    margin: 15,
    elevation: 2,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileId: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayCard: {
    margin: 15,
    elevation: 2,
  },
  enrollmentWarning: {
    alignItems: 'center',
    padding: 20,
  },
  warningText: {
    fontSize: 16,
    color: '#FF9800',
    marginTop: 10,
    marginBottom: 15,
  },
  enrollButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  enrollButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  attendanceMarked: {
    alignItems: 'center',
    padding: 20,
  },
  markedText: {
    fontSize: 18,
    color: '#4CAF50',
    marginTop: 10,
    fontWeight: 'bold',
  },
  markedTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  attendanceNotMarked: {
    alignItems: 'center',
    padding: 20,
  },
  notMarkedText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 15,
  },
  markButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  markButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsCard: {
    margin: 15,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  recentCard: {
    margin: 15,
    elevation: 2,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentInfo: {
    marginLeft: 15,
    flex: 1,
  },
  recentDate: {
    fontSize: 14,
    color: '#333',
  },
  recentStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noRecords: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 0.45,
    elevation: 2,
  },
  actionText: {
    marginTop: 5,
    color: '#6C63FF',
    fontWeight: '600',
  },
});

export default ScholarDashboardScreen;