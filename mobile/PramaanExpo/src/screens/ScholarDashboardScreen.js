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
import {
  Card,
  Title,
  Paragraph,
  Button,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { scholarService, attendanceService } from '../services/api';

const ScholarDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    lastAttendance: null,
    streak: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get scholar stats
      const statsResponse = await scholarService.getStats();
      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      // Check today's attendance
      const todayResponse = await attendanceService.checkTodayAttendance();
      setTodayAttendance(todayResponse.marked);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleMarkAttendance = () => {
    if (todayAttendance) {
      Alert.alert('Already Marked', 'You have already marked attendance for today.');
    } else {
      navigation.navigate('MarkAttendance');
    }
  };

  const AttendanceCard = () => (
    <Card style={styles.attendanceCard}>
      <Card.Content>
        <View style={styles.attendanceHeader}>
          <Icon 
            name={todayAttendance ? 'check-circle' : 'radio-button-unchecked'} 
            size={48} 
            color={todayAttendance ? '#4CAF50' : '#FF5252'} 
          />
          <View style={styles.attendanceInfo}>
            <Title style={styles.attendanceTitle}>
              {todayAttendance ? 'Attendance Marked' : 'Not Marked Yet'}
            </Title>
            <Paragraph style={styles.attendanceSubtitle}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Paragraph>
          </View>
        </View>
        
        {!todayAttendance && (
          <Button
            mode="contained"
            onPress={handleMarkAttendance}
            style={styles.markButton}
            icon="fingerprint"
          >
            Mark Attendance
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const StatsCard = ({ title, value, color, icon }) => (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <Icon name={icon} size={24} color={color} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Scholar'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Icon name="account-circle" size={40} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Attendance */}
        <AttendanceCard />

        {/* Attendance Overview */}
        <Card style={styles.overviewCard}>
          <Card.Title title="Attendance Overview" />
          <Card.Content>
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Overall Attendance</Text>
                <Text style={styles.progressValue}>
                  {stats.attendancePercentage.toFixed(1)}%
                </Text>
              </View>
              <ProgressBar 
                progress={stats.attendancePercentage / 100} 
                color="#6C63FF" 
                style={styles.progressBar}
              />
            </View>

            {stats.streak > 0 && (
              <View style={styles.streakContainer}>
                <Icon name="local-fire-department" size={24} color="#FF6B6B" />
                <Text style={styles.streakText}>
                  {stats.streak} day streak!
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatsCard
            title="Total Days"
            value={stats.totalDays}
            color="#2196F3"
            icon="calendar-today"
          />
          <StatsCard
            title="Present"
            value={stats.presentDays}
            color="#4CAF50"
            icon="check-circle"
          />
          <StatsCard
            title="Absent"
            value={stats.absentDays}
            color="#FF5252"
            icon="cancel"
          />
          <StatsCard
            title="Percentage"
            value={`${stats.attendancePercentage.toFixed(0)}%`}
            color="#FF9800"
            icon="pie-chart"
          />
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <Button
              mode="outlined"
              icon="history"
              onPress={() => navigation.navigate('AttendanceHistory')}
              style={styles.actionButton}
            >
              View History
            </Button>
            <Button
              mode="outlined"
              icon="download"
              onPress={() => navigation.navigate('DownloadReport')}
              style={styles.actionButton}
            >
              Download Report
            </Button>
            <Button
              mode="outlined"
              icon="qrcode"
              onPress={() => navigation.navigate('VerifyProof')}
              style={styles.actionButton}
            >
              Verify Proof
            </Button>
          </Card.Content>
        </Card>

        {/* Last Attendance */}
        {stats.lastAttendance && (
          <Card style={styles.lastAttendanceCard}>
            <Card.Content>
              <View style={styles.lastAttendanceHeader}>
                <Icon name="access-time" size={20} color="#666" />
                <Text style={styles.lastAttendanceText}>
                  Last attendance: {new Date(stats.lastAttendance).toLocaleString()}
                </Text>
              </View>
            </Card.Content>
          </Card>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  attendanceCard: {
    margin: 16,
    elevation: 3,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceInfo: {
    marginLeft: 16,
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  attendanceSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  markButton: {
    marginTop: 8,
    backgroundColor: '#6C63FF',
  },
  overviewCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  progressContainer: {
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  streakText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  actionButton: {
    marginBottom: 12,
    borderColor: '#6C63FF',
  },
  lastAttendanceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 1,
  },
  lastAttendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastAttendanceText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default ScholarDashboardScreen;