// mobile/PramaanExpo/src/screens/AdminDashboardScreen.js
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
  Portal,
  Dialog,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { organizationService, adminService } from '../services/api';

const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalScholars: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
  });
  const [organization, setOrganization] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');
      
      // Load organization details
      try {
        const orgData = await organizationService.getDetails();
        console.log('Organization data:', orgData);
        
        if (orgData.success && orgData.organization) {
          setOrganization(orgData.organization);
        }
      } catch (orgError) {
        console.error('Error loading organization:', orgError);
      }

      // Load dashboard data
      try {
        const dashboardData = await adminService.getDashboard();
        console.log('Dashboard data:', dashboardData);
        
        if (dashboardData.success) {
          if (dashboardData.stats) {
            setStats(dashboardData.stats);
          }
          if (dashboardData.recentActivity) {
            setRecentActivity(dashboardData.recentActivity);
          }
        }
      } catch (dashError) {
        console.error('Error loading dashboard:', dashError);
      }

      // Load analytics (optional)
      try {
        const analyticsData = await adminService.getAnalytics();
        console.log('Analytics data:', analyticsData);
        // Process analytics data if needed
      } catch (analyticsError) {
        console.error('Error loading analytics:', analyticsError);
        // Analytics is optional, so we don't show error to user
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await logout();
      // Navigation will be handled by AppNavigator when auth state changes
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const navigateToScreen = (screen, params = {}) => {
    navigation.navigate(screen, params);
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={[styles.statCard, { borderLeftColor: color }]}>
        <Card.Content style={styles.statCardContent}>
          <View style={styles.statIconContainer}>
            <Icon name={icon} size={32} color={color} />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => Alert.alert('Notifications', 'No new notifications')}
          />
          <IconButton
            icon="logout"
            size={24}
            onPress={() => setShowLogoutDialog(true)}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Organization Info */}
        <Card style={styles.orgCard}>
          <Card.Content>
            <View style={styles.orgHeader}>
              <Icon name="business" size={24} color="#6C63FF" />
              <View style={styles.orgInfo}>
                <Title style={styles.orgName}>
                  {organization?.name || 'Organization'}
                </Title>
                <Paragraph style={styles.orgCode}>
                  Code: {organization?.code || '------'}
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Scholars"
            value={stats.totalScholars}
            icon="people"
            color="#6C63FF"
            onPress={() => navigateToScreen('Reports', { tab: 'scholars' })}
          />
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon="check-circle"
            color="#4CAF50"
            onPress={() => navigateToScreen('Reports', { tab: 'today' })}
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon="cancel"
            color="#FF5252"
            onPress={() => navigateToScreen('Reports', { tab: 'absent' })}
          />
          <StatCard
            title="Attendance Rate"
            value={`${stats.attendanceRate || 0}%`}
            icon="insights"
            color="#FF9800"
          />
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Title title="Quick Actions" />
          <Card.Content>
            <Button
              mode="outlined"
              icon={() => <Icon name="person-add-alt" size={20} color="#6C63FF" />}
              onPress={() => navigateToScreen('AddScholar')}
              style={styles.actionButton}
            >
              Add New Scholar
            </Button>
            <Button
              mode="outlined"
              icon={() => <Icon name="description" size={20} color="#6C63FF" />}
              onPress={() => navigateToScreen('Reports')}
              style={styles.actionButton}
            >
              View Reports
            </Button>
            <Button
              mode="outlined"
              icon={() => <Icon name="qr-code-scanner" size={20} color="#6C63FF" />}
              onPress={() => navigateToScreen('VerifyProof')}
              style={styles.actionButton}
            >
              Verify Attendance
            </Button>
            <Button
              mode="outlined"
              icon={() => <Icon name="settings" size={20} color="#6C63FF" />}
              onPress={() => navigateToScreen('Settings')}
              style={styles.actionButton}
            >
              Organization Settings
            </Button>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <Card style={styles.activityCard}>
            <Card.Title title="Recent Activity" />
            <Card.Content>
              {recentActivity.slice(0, 5).map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                  <Icon name="event" size={16} color="#666" />
                  <Text style={styles.activityText}>{activity.description}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigateToScreen('AddScholar')}
      />

      {/* Logout Dialog */}
      <Portal>
        <Dialog
          visible={showLogoutDialog}
          onDismiss={() => setShowLogoutDialog(false)}
        >
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to logout?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={handleLogout} mode="contained">Logout</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 80,
  },
  orgCard: {
    margin: 16,
    elevation: 2,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgInfo: {
    marginLeft: 12,
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
  },
  orgCode: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionsCard: {
    margin: 16,
    elevation: 2,
  },
  actionButton: {
    marginBottom: 12,
    borderColor: '#6C63FF',
  },
  activityCard: {
    margin: 16,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
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