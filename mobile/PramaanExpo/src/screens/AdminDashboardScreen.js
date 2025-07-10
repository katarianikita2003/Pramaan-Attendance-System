// mobile/PramaanExpo/src/screens/AdminDashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Portal,
  Dialog,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [orgData, dashboardData] = await Promise.all([
        organizationService.getDetails(),
        adminService.getDashboard(),
      ]);

      if (orgData.success) {
        setOrganization(orgData.organization);
      }

      if (dashboardData.success) {
        setStats(dashboardData.stats);
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

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
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
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowLogoutDialog(true)}>
          <Icon name="logout" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Organization Info */}
        <Card style={styles.orgCard}>
          <Card.Content>
            <View style={styles.orgHeader}>
              <Icon name="business" size={24} color="#6C63FF" />
              <View style={styles.orgInfo}>
                <Title style={styles.orgName}>
                  {organization?.name || 'Loading...'}
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
            onPress={() => navigation.navigate('Reports', { tab: 'scholars' })}
          />
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon="check-circle"
            color="#4CAF50"
            onPress={() => navigation.navigate('Reports', { tab: 'today' })}
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon="cancel"
            color="#FF5252"
            onPress={() => navigation.navigate('Reports', { tab: 'absent' })}
          />
          <StatCard
            title="Attendance Rate"
            value={`${stats.attendanceRate}%`}
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
              icon="account-plus"
              onPress={() => navigation.navigate('AddScholar')}
              style={styles.actionButton}
            >
              Add New Scholar
            </Button>
            <Button
              mode="outlined"
              icon="file-document"
              onPress={() => navigation.navigate('Reports')}
              style={styles.actionButton}
            >
              View Reports
            </Button>
            <Button
              mode="outlined"
              icon="map-marker"
              onPress={() => navigation.navigate('Settings', { tab: 'boundaries' })}
              style={styles.actionButton}
            >
              Set Boundaries
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddScholar')}
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
            <Button onPress={handleLogout}>Logout</Button>
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
});

export default AdminDashboardScreen;
