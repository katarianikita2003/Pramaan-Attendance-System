// src/screens/ScholarDashboardScreen.js - Scholar Dashboard with Stats
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Surface,
  ActivityIndicator,
  Avatar,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { scholarService, attendanceService } from '../services/api';
import biometricService from '../services/biometricService';

const { width, height } = Dimensions.get('window');
const chartWidth = width - 32;

const ScholarDashboardScreen = ({ navigation }) => {
  const { user, organization } = useAuth();
  const { currentLocation, isWithinBounds } = useLocation();
  
  const [scholarData, setScholarData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [biometricStatus, setBiometricStatus] = useState({ enrolled: false });
  const [recentAttendance, setRecentAttendance] = useState([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadScholarData();
    checkBiometricStatus();
    startAnimations();
    startPulseAnimation();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadScholarData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [profileResponse, statsResponse, historyResponse] = await Promise.all([
        scholarService.getDashboardData(),
        scholarService.getStats('month'),
        scholarService.getAttendanceHistory(1, 7), // Last 7 records
      ]);

      if (profileResponse.success) {
        setScholarData(profileResponse.data);
        setTodayAttendance(profileResponse.data.todayAttendance);
      }

      if (statsResponse.success) {
        setAttendanceStats(statsResponse.data);
      }

      if (historyResponse.success) {
        setRecentAttendance(historyResponse.data.records || []);
      }
    } catch (error) {
      console.error('Error loading scholar data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const enrolled = await biometricService.isBiometricEnrolled();
      const enrollmentStatus = await biometricService.getEnrollmentStatus();
      
      setBiometricStatus({
        enrolled,
        enrollmentData: enrollmentStatus,
      });
    } catch (error) {
      console.error('Error checking biometric status:', error);
    }
  };

  const onRefresh = () => {
    loadScholarData(true);
    checkBiometricStatus();
  };

  const handleMarkAttendance = () => {
    if (!biometricStatus.enrolled) {
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
      return;
    }

    if (!isWithinBounds) {
      Alert.alert(
        'Location Required',
        'You must be within campus boundaries to mark attendance.',
        [{ text: 'OK' }]
      );
      return;
    }

    navigation.navigate('Attendance');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Scholar'}
          </Text>
          <Text style={styles.scholarId}>ID: {user?.scholarId}</Text>
          <Text style={styles.organizationName}>{organization?.name}</Text>
        </View>
        <Avatar.Image
          size={50}
          source={{ uri: user?.profilePhoto }}
          style={styles.avatar}
        />
      </View>
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderTodayStatus = () => {
    const hasMarkedToday = todayAttendance !== null;
    const isLate = todayAttendance && new Date(todayAttendance.timestamp).getHours() > 9;

    return (
      <Animated.View style={[
        styles.todayStatusCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}>
        <Surface style={styles.todayStatusSurface}>
          <View style={styles.todayStatusContent}>
            <View style={styles.todayStatusIcon}>
              <Icon
                name={hasMarkedToday ? 'check-circle' : 'schedule'}
                size={32}
                color={hasMarkedToday ? '#4CAF50' : '#FF9800'}
              />
            </View>
            <View style={styles.todayStatusText}>
              <Text style={styles.todayStatusTitle}>
                {hasMarkedToday ? 'Attendance Marked' : 'Attendance Pending'}
              </Text>
              <Text style={styles.todayStatusSubtitle}>
                {hasMarkedToday
                  ? `Marked at ${new Date(todayAttendance.timestamp).toLocaleTimeString()} ${isLate ? '(Late)' : ''}`
                  : 'Mark your attendance for today'
                }
              </Text>
            </View>
            {hasMarkedToday && (
              <Chip
                icon="verified"
                style={[styles.statusChip, { backgroundColor: '#E8F5E8' }]}
                textStyle={{ color: '#4CAF50' }}
              >
                Verified
              </Chip>
            )}
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderQuickStats = () => {
    if (!attendanceStats) return null;

    const stats = [
      {
        title: 'This Month',
        value: `${attendanceStats.thisMonth || 0}%`,
        icon: 'calendar-today',
        color: '#6C63FF',
        subtitle: `${attendanceStats.presentDays || 0}/${attendanceStats.totalDays || 0} days`,
      },
      {
        title: 'Overall',
        value: `${attendanceStats.overall || 0}%`,
        icon: 'trending-up',
        color: '#4CAF50',
        subtitle: 'All time average',
      },
      {
        title: 'Streak',
        value: `${attendanceStats.currentStreak || 0}`,
        icon: 'local-fire-department',
        color: '#FF9800',
        subtitle: 'Days in a row',
      },
      {
        title: 'ZKP Proofs',
        value: `${attendanceStats.totalProofs || 0}`,
        icon: 'security',
        color: '#9C27B0',
        subtitle: 'Generated',
      },
    ];

    return (
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <Animated.View
            key={index}
            style={[
              styles.statCard,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 50 + index * 10],
                  })
                }]
              }
            ]}
          >
            <Surface style={styles.statSurface}>
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Icon name={stat.icon} size={20} color="white" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
            </Surface>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderAttendanceChart = () => {
    if (!attendanceStats?.chartData) return null;

    const data = {
      labels: attendanceStats.chartData.labels || [],
      datasets: [{
        data: attendanceStats.chartData.values || [],
        color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
        strokeWidth: 2,
      }],
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Title
          title="Attendance Trend"
          subtitle="Last 30 days"
          left={(props) => <Icon {...props} name="show-chart" />}
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('History')}
              mode="text"
            >
              View All
            </Button>
          )}
        />
        <Card.Content>
          <LineChart
            data={data}
            width={chartWidth - 32}
            height={180}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '3',
                strokeWidth: '2',
                stroke: '#6C63FF',
              },
            }}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderAttendanceGoal = () => {
    const targetAttendance = 85; // 85% target
    const currentAttendance = attendanceStats?.thisMonth || 0;
    const progress = currentAttendance / 100;

    return (
      <Card style={styles.goalCard}>
        <Card.Title
          title="Attendance Goal"
          subtitle={`Target: ${targetAttendance}%`}
          left={(props) => <Icon {...props} name="flag" />}
        />
        <Card.Content>
          <View style={styles.goalContent}>
            <ProgressChart
              data={{
                data: [progress],
              }}
              width={120}
              height={120}
              strokeWidth={8}
              radius={50}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              }}
              hideLegend
            />
            <View style={styles.goalText}>
              <Text style={styles.goalValue}>{currentAttendance}%</Text>
              <Text style={styles.goalLabel}>Current</Text>
              <Text style={styles.goalTarget}>
                {currentAttendance >= targetAttendance
                  ? '🎉 Goal Achieved!'
                  : `${targetAttendance - currentAttendance}% to go`
                }
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderRecentAttendance = () => {
    if (!recentAttendance.length) return null;

    return (
      <Card style={styles.recentCard}>
        <Card.Title
          title="Recent Attendance"
          subtitle="Last 7 entries"
          left={(props) => <Icon {...props} name="history" />}
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('History')}
              mode="text"
            >
              View All
            </Button>
          )}
        />
        <Card.Content>
          {recentAttendance.slice(0, 5).map((record, index) => (
            <View key={index} style={styles.recentItem}>
              <View style={styles.recentDate}>
                <Text style={styles.recentDateText}>
                  {new Date(record.timestamp).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentTime}>
                  {new Date(record.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.recentStatus}>
                  {record.status || 'Present'}
                </Text>
              </View>
              <Icon
                name={record.verified ? 'verified' : 'schedule'}
                size={16}
                color={record.verified ? '#4CAF50' : '#FF9800'}
              />
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderMarkAttendanceButton = () => (
    <Animated.View style={[
      styles.attendanceButtonContainer,
      { transform: [{ scale: pulseAnim }] }
    ]}>
      <Surface style={styles.attendanceButtonSurface}>
        <Button
          mode="contained"
          onPress={handleMarkAttendance}
          disabled={todayAttendance !== null || !isWithinBounds}
          style={[
            styles.attendanceButton,
            {
              backgroundColor: todayAttendance
                ? '#4CAF50'
                : isWithinBounds
                ? '#6C63FF'
                : '#CCCCCC'
            }
          ]}
          contentStyle={styles.attendanceButtonContent}
          labelStyle={styles.attendanceButtonLabel}
        >
          <Icon
            name={todayAttendance ? 'check-circle' : 'fingerprint'}
            size={24}
            color="white"
          />
          <Text style={styles.attendanceButtonText}>
            {todayAttendance
              ? 'Attendance Marked'
              : isWithinBounds
              ? 'Mark Attendance'
              : 'Outside Campus'
            }
          </Text>
        </Button>
      </Surface>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard}>
      <Card.Title
        title="Quick Actions"
        left={(props) => <Icon {...props} name="flash-on" />}
      />
      <Card.Content>
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('History')}
            style={styles.quickActionButton}
            icon="history"
          >
            View History
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('ProofDownload')}
            style={styles.quickActionButton}
            icon="download"
          >
            Download Proof
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Profile')}
            style={styles.quickActionButton}
            icon="person"
          >
            Profile
          </Button>
          
          {!biometricStatus.enrolled && (
            <Button
              mode="contained"
              onPress={() => navigation.navigate('BiometricEnrollment')}
              style={styles.quickActionButton}
              icon="fingerprint"
            >
              Enroll Biometric
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#6C63FF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderTodayStatus()}
        {renderQuickStats()}
        {renderMarkAttendanceButton()}
        {renderAttendanceChart()}
        {renderAttendanceGoal()}
        {renderRecentAttendance()}
        {renderQuickActions()}
      </ScrollView>
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
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scholarId: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  organizationName: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '500',
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  todayStatusCard: {
    margin: 16,
  },
  todayStatusSurface: {
    borderRadius: 12,
    elevation: 4,
    backgroundColor: 'white',
  },
  todayStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  todayStatusIcon: {
    marginRight: 16,
  },
  todayStatusText: {
    flex: 1,
  },
  todayStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayStatusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    margin: 4,
  },
  statSurface: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  attendanceButtonContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  attendanceButtonSurface: {
    borderRadius: 50,
    elevation: 8,
  },
  attendanceButton: {
    width: 200,
    height: 60,
    borderRadius: 30,
  },
  attendanceButtonContent: {
    width: 200,
    height: 60,
    flexDirection: 'row',
  },
  attendanceButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendanceButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  chartCard: {
    margin: 16,
    elevation: 4,
  },
  chart: {
    borderRadius: 16,
  },
  goalCard: {
    margin: 16,
    elevation: 4,
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalText: {
    flex: 1,
    marginLeft: 20,
  },
  goalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  goalLabel: {
    fontSize: 14,
    color: '#666',
  },
  goalTarget: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  recentCard: {
    margin: 16,
    elevation: 4,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentDate: {
    width: 50,
    alignItems: 'center',
  },
  recentDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
  },
  recentContent: {
    flex: 1,
    marginLeft: 12,
  },
  recentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recentStatus: {
    fontSize: 12,
    color: '#666',
  },
  quickActionsCard: {
    margin: 16,
    elevation: 4,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flex: 0.48,
    marginBottom: 8,
  },
});

export default ScholarDashboardScreen;