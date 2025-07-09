// src/screens/ScholarDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Text,
  Avatar,
  ProgressBar,
  Chip,
  IconButton,
  Menu,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface ScholarStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number;
  lastAttendance: string | null;
  streak: number;
}

export default function ScholarDashboard({ navigation }) {
  const [scholarData, setScholarData] = useState(null);
  const [stats, setStats] = useState<ScholarStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    lastAttendance: null,
    streak: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('userData');
      const headers = { Authorization: `Bearer ${token}` };

      if (userData) {
        setScholarData(JSON.parse(userData));
      }

      // Fetch scholar stats
      const statsResponse = await api.get('/scholar/stats', { headers });
      setStats(statsResponse.data.stats);

      // Check today's attendance
      const todayResponse = await api.get('/attendance/today', { headers });
      setTodayAttendance(todayResponse.data.marked);
    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'userData', 'userType']);
            navigation.replace('Welcome');
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAttendanceStatus = () => {
    if (todayAttendance) {
      return { text: 'Marked', color: '#27AE60', icon: 'check-circle' };
    }
    return { text: 'Not Marked', color: '#E74C3C', icon: 'close-circle' };
  };

  const attendanceStatus = getAttendanceStatus();

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Avatar.Text
              size={48}
              label={scholarData?.name?.charAt(0) || 'S'}
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Title style={styles.scholarName}>
                {scholarData?.name || 'Scholar'}
              </Title>
            </View>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('ScholarProfile');
              }}
              title="Profile"
              leadingIcon="account"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleLogout();
              }}
              title="Logout"
              leadingIcon="logout"
            />
          </Menu>
        </View>
      </Surface>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Status Card */}
        <Card style={[styles.statusCard, { borderColor: attendanceStatus.color }]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Title>Today's Attendance</Title>
              <Chip
                icon={attendanceStatus.icon}
                style={{ backgroundColor: attendanceStatus.color }}
                textStyle={{ color: 'white' }}
              >
                {attendanceStatus.text}
              </Chip>
            </View>
            {!todayAttendance && (
              <Button
                mode="contained"
                icon="fingerprint"
                onPress={() => navigation.navigate('MarkAttendance')}
                style={styles.markButton}
                contentStyle={styles.markButtonContent}
              >
                Mark Attendance Now
              </Button>
            )}
            {todayAttendance && stats.lastAttendance && (
              <Text style={styles.lastMarkedText}>
                Last marked at {new Date(stats.lastAttendance).toLocaleTimeString()}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Attendance Overview */}
        <Card style={styles.overviewCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Attendance Overview</Title>
            
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Overall Attendance</Text>
                <Text style={styles.progressValue}>
                  {stats.attendancePercentage}%
                </Text>
              </View>
              <ProgressBar
                progress={stats.attendancePercentage / 100}
                color="#6C63FF"
                style={styles.progressBar}
              />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.presentDays}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.absentDays}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalDays}</Text>
                <Text style={styles.statLabel}>Total Days</Text>
              </View>
            </View>

            {stats.streak > 0 && (
              <Surface style={styles.streakCard}>
                <Text style={styles.streakIcon}>🔥</Text>
                <View>
                  <Text style={styles.streakText}>
                    {stats.streak} Day Streak!
                  </Text>
                  <Text style={styles.streakSubtext}>
                    Keep up the good work
                  </Text>
                </View>
              </Surface>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Quick Actions</Title>
            
            <Button
              mode="outlined"
              icon="history"
              onPress={() => navigation.navigate('AttendanceHistory')}
              style={styles.actionButton}
            >
              View Attendance History
            </Button>

            <Button
              mode="outlined"
              icon="qrcode"
              onPress={() => navigation.navigate('VerifyProof')}
              style={styles.actionButton}
            >
              Verify Attendance Proof
            </Button>

            <Button
              mode="outlined"
              icon="download"
              onPress={() => Alert.alert('Coming Soon', 'Download report feature will be available soon')}
              style={styles.actionButton}
            >
              Download Report
            </Button>
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Surface style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Privacy Protected</Text>
            <Text style={styles.infoText}>
              Your biometric data never leaves your device. Pramaan uses Zero-Knowledge Proofs to verify your attendance.
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    elevation: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#6C63FF',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  scholarName: {
    fontSize: 20,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
    elevation: 3,
    borderWidth: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  markButton: {
    backgroundColor: '#6C63FF',
  },
  markButtonContent: {
    paddingVertical: 8,
  },
  lastMarkedText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  overviewCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    elevation: 1,
  },
  streakIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
  },
  streakSubtext: {
    fontSize: 12,
    color: '#666',
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionButton: {
    marginBottom: 12,
    borderColor: '#6C63FF',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});