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
  FAB,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { scholarService } from '../services/api';

const ScholarDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalDays: 0,
    attendancePercentage: 0,
  });
  const [todayAttendance, setTodayAttendance] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await scholarService.getStats();
      
      if (response.success) {
        setStats(response.stats);
        // Check if attendance is marked today
        const today = new Date().toDateString();
        // This would come from the API
        setTodayAttendance(null); // or 'present'/'absent'
      }
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
      Alert.alert(
        'Already Marked',
        'You have already marked your attendance for today.',
        [{ text: 'OK' }]
      );
    } else {
      navigation.navigate('MarkAttendance');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name || 'Scholar'}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Icon name="logout" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Status */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Title style={styles.statusTitle}>Today's Attendance</Title>
              {todayAttendance ? (
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    todayAttendance === 'present' 
                      ? styles.presentChip 
                      : styles.absentChip
                  ]}
                >
                  {todayAttendance === 'present' ? 'Marked' : 'Absent'}
                </Chip>
              ) : (
                <Chip mode="flat" style={styles.notMarkedChip}>
                  Not Marked
                </Chip>
              )}
            </View>
            
            {!todayAttendance && (
              <Button
                mode="contained"
                icon="fingerprint"
                onPress={handleMarkAttendance}
                style={styles.markButton}
                contentStyle={styles.markButtonContent}
              >
                Mark Attendance Now
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Attendance Overview */}
        <Card style={styles.overviewCard}>
          <Card.Title 
            title="Attendance Overview" 
            subtitle={`Overall Attendance: ${stats.attendancePercentage}%`}
          />
          <Card.Content>
            <ProgressBar 
              progress={stats.attendancePercentage / 100} 
              color="#4CAF50" 
              style={styles.progressBar}
            />
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalPresent}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalAbsent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalDays}</Text>
                <Text style={styles.statLabel}>Total Days</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionItem}
          onPress={() => navigation.navigate('AttendanceHistory')}
        >
          <Icon name="history" size={24} color="#6C63FF" />
          <Text style={styles.actionText}>View Attendance History</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionItem}
          onPress={() => navigation.navigate('VerifyProof')}
        >
          <Icon name="verified-user" size={24} color="#6C63FF" />
          <Text style={styles.actionText}>Verify Attendance Proof</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionItem}
          onPress={() => navigation.navigate('DownloadReport')}
        >
          <Icon name="download" size={24} color="#6C63FF" />
          <Text style={styles.actionText}>Download Report</Text>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        {/* Privacy Notice */}
        <Card style={styles.privacyCard}>
          <Card.Content>
            <View style={styles.privacyHeader}>
              <Icon name="lock" size={20} color="#FFA000" />
              <Title style={styles.privacyTitle}>Privacy Protected</Title>
            </View>
            <Paragraph style={styles.privacyText}>
              Your biometric data never leaves your device. Pramaan uses 
              Zero-Knowledge Proof technology to verify your identity without 
              storing or transmitting your biometric information.
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* FAB for Mark Attendance */}
      {!todayAttendance && (
        <FAB
          icon="fingerprint"
          label="Mark Attendance"
          style={styles.fab}
          onPress={handleMarkAttendance}
        />
      )}
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
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statusCard: {
    margin: 16,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusChip: {
    elevation: 0,
  },
  presentChip: {
    backgroundColor: '#E8F5E9',
  },
  absentChip: {
    backgroundColor: '#FFEBEE',
  },
  notMarkedChip: {
    backgroundColor: '#FFF3E0',
  },
  markButton: {
    backgroundColor: '#6C63FF',
  },
  markButtonContent: {
    paddingVertical: 8,
  },
  overviewCard: {
    margin: 16,
    elevation: 2,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 12,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  actionText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  privacyCard: {
    margin: 16,
    marginTop: 24,
    backgroundColor: '#FFF8E1',
    elevation: 1,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 16,
    marginLeft: 8,
    color: '#F57C00',
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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