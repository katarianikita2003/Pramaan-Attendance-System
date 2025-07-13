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
} from 'react-native';
import { Card, Avatar, Button, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ScholarDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    stats: {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      percentage: 0,
    },
    recentAttendance: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load scholar profile
      const profileResponse = await api.get('/scholar/profile');
      
      // Load attendance stats
      const statsResponse = await api.get('/scholar/stats');
      
      // Load recent attendance history
      const historyResponse = await api.get('/scholar/attendance/history?limit=5');
      
      setDashboardData({
        profile: profileResponse.data.profile || profileResponse.data,
        stats: statsResponse.data.stats || {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          percentage: 0,
        },
        recentAttendance: historyResponse.data.attendance || [],
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Set default data if API fails
      setDashboardData({
        profile: {
          personalInfo: {
            name: user?.name || 'Scholar',
            email: user?.email || '',
          },
          scholarId: user?.scholarId || '',
        },
        stats: {
          totalDays: 100,
          presentDays: 0,
          absentDays: 0,
          percentage: 0,
        },
        recentAttendance: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleMarkAttendance = () => {
    navigation.navigate('MarkAttendance');
  };

  const handleViewHistory = () => {
    navigation.navigate('AttendanceHistory');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>
              {dashboardData.profile?.personalInfo?.name || user?.name || 'Scholar'}
            </Text>
            <Text style={styles.scholarId}>
              ID: {dashboardData.profile?.scholarId || user?.scholarId || 'N/A'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Avatar.Icon size={48} icon="logout" style={styles.logoutButton} />
          </TouchableOpacity>
        </View>

        {/* Attendance Stats Card */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Attendance Overview</Text>
            
            {/* Circular Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressCircle}>
                <Text style={[
                  styles.percentageText,
                  { color: getAttendanceColor(dashboardData.stats.percentage) }
                ]}>
                  {dashboardData.stats.percentage}%
                </Text>
                <Text style={styles.percentageLabel}>Attendance</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{dashboardData.stats.totalDays}</Text>
                <Text style={styles.statLabel}>Total Days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                  {dashboardData.stats.presentDays}
                </Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F44336' }]}>
                  {dashboardData.stats.absentDays}
                </Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleMarkAttendance}
          >
            <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
            <Text style={styles.actionText}>Mark Attendance</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewHistory}
          >
            <MaterialIcons name="history" size={32} color="#2196F3" />
            <Text style={styles.actionText}>View History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ScholarProfile')}
          >
            <MaterialIcons name="person" size={32} color="#FF9800" />
            <Text style={styles.actionText}>My Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Attendance */}
        <Card style={styles.recentCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Recent Attendance</Text>
            {dashboardData.recentAttendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records yet</Text>
            ) : (
              dashboardData.recentAttendance.map((record, index) => (
                <View key={index} style={styles.attendanceItem}>
                  <View>
                    <Text style={styles.attendanceDate}>
                      {new Date(record.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.attendanceTime}>
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: record.status === 'present' ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Text style={styles.statusText}>
                      {record.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Organization Info */}
        <Card style={styles.orgCard}>
          <Card.Content>
            <View style={styles.orgInfo}>
              <MaterialIcons name="business" size={24} color="#666" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.orgName}>{user?.organizationName || 'Organization'}</Text>
                <Text style={styles.orgCode}>Code: {user?.organizationCode || 'N/A'}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="qrcode-scan"
        onPress={handleMarkAttendance}
        label="Mark Attendance"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 80,
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  scholarId: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#f5f5f5',
  },
  statsCard: {
    margin: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#e0e0e0',
  },
  percentageText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  percentageLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
  },
  recentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  attendanceTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  orgCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  orgInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orgCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
});

export default ScholarDashboardScreen;