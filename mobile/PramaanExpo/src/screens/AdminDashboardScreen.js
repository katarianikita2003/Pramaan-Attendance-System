// src/screens/AdminDashboardScreen.js - Complete Admin Dashboard
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Surface,
  FAB,
  ActivityIndicator,
  Chip,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';

const { width, height } = Dimensions.get('window');
const chartWidth = width - 32;

const AdminDashboardScreen = ({ navigation }) => {
  const { user, organization } = useAuth();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [recentActivity, setRecentActivity] = useState([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadDashboardData();
    startAnimations();
  }, [selectedPeriod]);

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

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [dashboardResponse, analyticsResponse] = await Promise.all([
        adminService.getDashboardData(),
        adminService.getAnalytics(selectedPeriod),
      ]);

      if (dashboardResponse.success && analyticsResponse.success) {
        setDashboardData({
          ...dashboardResponse.data,
          analytics: analyticsResponse.data,
        });
        
        // Extract recent activity
        if (dashboardResponse.data.recentActivity) {
          setRecentActivity(dashboardResponse.data.recentActivity);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadDashboardData(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.adminName}>{user?.name || 'Admin'}</Text>
          <Text style={styles.organizationName}>{organization?.name}</Text>
        </View>
        <Avatar.Text
          size={50}
          label={user?.name?.substring(0, 2) || 'AD'}
          style={styles.avatar}
        />
      </View>
    </View>
  );

  const renderStatsCards = () => {
    if (!dashboardData) return null;

    const stats = [
      {
        title: 'Total Scholars',
        value: dashboardData.totalScholars || 0,
        icon: 'group',
        color: '#6C63FF',
        subtitle: `+${dashboardData.newScholarsThisWeek || 0} this week`,
      },
      {
        title: 'Present Today',
        value: dashboardData.presentToday || 0,
        icon: 'check-circle',
        color: '#4CAF50',
        subtitle: `${((dashboardData.presentToday / dashboardData.totalScholars) * 100).toFixed(1)}% attendance`,
      },
      {
        title: 'ZKP Proofs',
        value: dashboardData.totalProofs || 0,
        icon: 'security',
        color: '#FF9800',
        subtitle: `${dashboardData.proofsToday || 0} generated today`,
      },
      {
        title: 'Avg. Attendance',
        value: `${dashboardData.averageAttendance || 0}%`,
        icon: 'trending-up',
        color: '#9C27B0',
        subtitle: 'Last 30 days',
      },
    ];

    return (
      <Animated.View style={[
        styles.statsContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}>
        {stats.map((stat, index) => (
          <Surface key={index} style={[styles.statCard, { elevation: 4 }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Icon name={stat.icon} size={24} color="white" />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
              </View>
            </View>
          </Surface>
        ))}
      </Animated.View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      <Text style={styles.sectionTitle}>Analytics</Text>
      <View style={styles.periodChips}>
        {['week', 'month', 'quarter'].map((period) => (
          <Chip
            key={period}
            selected={selectedPeriod === period}
            onPress={() => setSelectedPeriod(period)}
            style={styles.periodChip}
            textStyle={[
              styles.periodChipText,
              selectedPeriod === period && styles.selectedPeriodChipText
            ]}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Chip>
        ))}
      </View>
    </View>
  );

  const renderAttendanceChart = () => {
    if (!dashboardData?.analytics?.attendanceData) return null;

    const data = {
      labels: dashboardData.analytics.attendanceData.labels || [],
      datasets: [{
        data: dashboardData.analytics.attendanceData.values || [],
        color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Title
          title="Attendance Trend"
          subtitle={`${selectedPeriod} overview`}
          left={(props) => <Icon {...props} name="trending-up" />}
        />
        <Card.Content>
          <LineChart
            data={data}
            width={chartWidth - 32}
            height={200}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '4',
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

  const renderDepartmentChart = () => {
    if (!dashboardData?.analytics?.departmentData) return null;

    const data = dashboardData.analytics.departmentData.map((item, index) => ({
      name: item.department,
      population: item.count,
      color: ['#6C63FF', '#4CAF50', '#FF9800', '#F44336', '#9C27B0'][index % 5],
      legendFontColor: '#333',
      legendFontSize: 12,
    }));

    return (
      <Card style={styles.chartCard}>
        <Card.Title
          title="Department Distribution"
          subtitle="Scholar count by department"
          left={(props) => <Icon {...props} name="pie-chart" />}
        />
        <Card.Content>
          <PieChart
            data={data}
            width={chartWidth - 32}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
    );
  };

  const renderRecentActivity = () => {
    if (!recentActivity.length) return null;

    return (
      <Card style={styles.activityCard}>
        <Card.Title
          title="Recent Activity"
          subtitle="Latest system events"
          left={(props) => <Icon {...props} name="notifications" />}
          right={(props) => (
            <Button
              {...props}
              onPress={() => navigation.navigate('Reports')}
              mode="text"
            >
              View All
            </Button>
          )}
        />
        <Card.Content>
          {recentActivity.slice(0, 5).map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={[
                styles.activityIcon,
                { backgroundColor: getActivityColor(activity.type) }
              ]}>
                <Icon
                  name={getActivityIcon(activity.type)}
                  size={16}
                  color="white"
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activitySubtitle}>{activity.description}</Text>
                <Text style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'attendance': return '#4CAF50';
      case 'enrollment': return '#6C63FF';
      case 'verification': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'attendance': return 'check-circle';
      case 'enrollment': return 'person-add';
      case 'verification': return 'verified';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const renderQuickActions = () => (
    <Card style={styles.quickActionsCard}>
      <Card.Title
        title="Quick Actions"
        subtitle="Common administrative tasks"
        left={(props) => <Icon {...props} name="dashboard" />}
      />
      <Card.Content>
        <View style={styles.quickActions}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('AddScholar')}
            style={styles.quickActionButton}
            icon="person-add"
          >
            Add Scholar
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Reports')}
            style={styles.quickActionButton}
            icon="assessment"
          >
            Generate Report
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('OrganizationSettings')}
            style={styles.quickActionButton}
            icon="settings"
          >
            Settings
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('VerifyProof')}
            style={styles.quickActionButton}
            icon="qr-code-scanner"
          >
            Verify Proof
          </Button>
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
        {renderStatsCards()}
        {renderPeriodSelector()}
        {renderAttendanceChart()}
        {renderDepartmentChart()}
        {renderRecentActivity()}
        {renderQuickActions()}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="add"
        onPress={() => navigation.navigate('AddScholar')}
        color="white"
      />
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
    paddingBottom: 100,
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
    fontSize: 14,
    color: '#666',
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2,
  },
  organizationName: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '500',
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    margin: 4,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  statContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  periodSelector: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  periodChips: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    backgroundColor: '#f0f0f0',
  },
  periodChipText: {
    fontSize: 12,
  },
  selectedPeriodChipText: {
    color: 'white',
  },
  chartCard: {
    margin: 16,
    elevation: 4,
  },
  chart: {
    borderRadius: 16,
  },
  activityCard: {
    margin: 16,
    elevation: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#999',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
});

export default AdminDashboardScreen;