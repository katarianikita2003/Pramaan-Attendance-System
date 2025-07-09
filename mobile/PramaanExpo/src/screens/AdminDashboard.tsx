// src/screens/AdminDashboard.tsx
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
  IconButton,
  Avatar,
  Divider,
  Menu,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface DashboardStats {
  totalScholars: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
}

export default function AdminDashboard({ navigation }) {
  const [organizationData, setOrganizationData] = useState(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalScholars: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
  });
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
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch organization data
      const orgResponse = await api.get('/organization/details', { headers });
      setOrganizationData(orgResponse.data.organization);

      // Fetch dashboard stats
      const statsResponse = await api.get('/admin/dashboard-stats', { headers });
      setStats(statsResponse.data.stats);
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

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Avatar.Icon size={48} icon="domain" style={styles.avatar} />
            <View style={styles.headerText}>
              <Title style={styles.orgName}>
                {organizationData?.name || 'Organization'}
              </Title>
              <Text style={styles.orgCode}>
                Code: {organizationData?.code || 'Loading...'}
              </Text>
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
                navigation.navigate('OrganizationSettings');
              }}
              title="Settings"
              leadingIcon="cog"
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
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: '#6C63FF' }]}>
            <Card.Content>
              <Text style={styles.statValue}>{stats.totalScholars}</Text>
              <Text style={styles.statLabel}>Total Scholars</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#27AE60' }]}>
            <Card.Content>
              <Text style={styles.statValue}>{stats.presentToday}</Text>
              <Text style={styles.statLabel}>Present Today</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#E74C3C' }]}>
            <Card.Content>
              <Text style={styles.statValue}>{stats.absentToday}</Text>
              <Text style={styles.statLabel}>Absent Today</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#F39C12' }]}>
            <Card.Content>
              <Text style={styles.statValue}>{stats.attendanceRate}%</Text>
              <Text style={styles.statLabel}>Attendance Rate</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Quick Actions</Title>
            
            <Button
              mode="contained"
              icon="account-plus"
              onPress={() => navigation.navigate('AddScholar')}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Add New Scholar
            </Button>

            <Button
              mode="outlined"
              icon="account-group"
              onPress={() => navigation.navigate('ViewScholars')}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              View All Scholars
            </Button>

            <Button
              mode="outlined"
              icon="chart-line"
              onPress={() => navigation.navigate('AttendanceReport')}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              Attendance Reports
            </Button>

            <Button
              mode="outlined"
              icon="history"
              onPress={() => navigation.navigate('AttendanceHistory')}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              View Attendance History
            </Button>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.activityCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Activity</Title>
            <View style={styles.activityItem}>
              <Text style={styles.activityTime}>10:30 AM</Text>
              <Text style={styles.activityText}>
                John Doe marked attendance
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.activityItem}>
              <Text style={styles.activityTime}>10:15 AM</Text>
              <Text style={styles.activityText}>
                Jane Smith marked attendance
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.activityItem}>
              <Text style={styles.activityTime}>09:45 AM</Text>
              <Text style={styles.activityText}>
                New scholar added: Mike Johnson
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="qrcode-scan"
        onPress={() => navigation.navigate('VerifyProof')}
        label="Verify Proof"
      />
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
  orgName: {
    fontSize: 20,
    marginBottom: 2,
  },
  orgCode: {
    fontSize: 14,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  activityCard: {
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    width: 70,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
  },
  divider: {
    marginVertical: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
});