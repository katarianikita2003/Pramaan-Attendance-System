<<<<<<< Updated upstream
﻿import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  Avatar,
  ProgressBar,
  Chip,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ScholarDashboard = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    percentage: 85,
    presentDays: 170,
    totalDays: 200,
    todayStatus: null,
  });

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text
              size={60}
              label="JS"
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Title style={styles.name}>John Scholar</Title>
              <Text style={styles.scholarId}>SCH-00001</Text>
              <Text style={styles.department}>Computer Science</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Card style={styles.actionCard}>
            <Card.Content style={styles.actionContent}>
              <View style={styles.actionHeader}>
                <Text style={styles.actionTitle}>Today's Status</Text>
                {attendanceData.todayStatus ? (
                  <Chip icon="check" style={styles.presentChip}>Present</Chip>
                ) : (
                  <Chip icon="clock-outline" style={styles.pendingChip}>Pending</Chip>
                )}
              </View>
              
              {!attendanceData.todayStatus && (
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('MarkAttendance')}
                  style={styles.markButton}
                  icon="fingerprint"
                >
                  Mark Attendance
                </Button>
              )}
            </Card.Content>
          </Card>
        </View>

        {/* Attendance Overview */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Attendance Overview</Title>
            
            <View style={styles.percentageContainer}>
              <Text style={[
                styles.percentage,
                { color: getAttendanceColor(attendanceData.percentage) }
              ]}>
                {attendanceData.percentage}%
              </Text>
              <Text style={styles.percentageLabel}>Overall Attendance</Text>
            </View>

            <ProgressBar
              progress={attendanceData.percentage / 100}
              color={getAttendanceColor(attendanceData.percentage)}
              style={styles.progressBar}
            />

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{attendanceData.presentDays}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{attendanceData.totalDays}</Text>
                <Text style={styles.statLabel}>Total Days</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {attendanceData.totalDays - attendanceData.presentDays}
                </Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Recent Activity</Title>
            
            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Marked attendance</Text>
                <Text style={styles.activityTime}>Today at 9:15 AM</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: '#FF9800' }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Late attendance</Text>
                <Text style={styles.activityTime}>Yesterday at 10:30 AM</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Certificate generated</Text>
                <Text style={styles.activityTime}>2 days ago</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Links */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Quick Links</Title>
            
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('AttendanceHistory')}
              style={styles.linkButton}
              icon="history"
            >
              View Full History
            </Button>

            <Button
              mode="outlined"
              onPress={() => {}}
              style={styles.linkButton}
              icon="certificate"
            >
              Generate Certificate
            </Button>

            <Button
              mode="outlined"
              onPress={() => {}}
              style={styles.linkButton}
              icon="account-edit"
            >
              Update Profile
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {!attendanceData.todayStatus && (
        <FAB
          style={styles.fab}
          icon="fingerprint"
          label="Mark Attendance"
          onPress={() => navigation.navigate('MarkAttendance')}
        />
      )}
    </SafeAreaView>
=======
﻿import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, Button } from 'react-native-paper';

const ScholarDashboard = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Scholar Dashboard</Title>
          <Text>Welcome, Student!</Text>
          <Text>Attendance: 85%</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('MarkAttendance')} 
            style={styles.button}
          >
            Mark Attendance
          </Button>
        </Card.Content>
      </Card>
    </View>
>>>>>>> Stashed changes
  );
};

const styles = StyleSheet.create({
<<<<<<< Updated upstream
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 15,
    elevation: 3,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  profileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  name: {
    fontSize: 20,
    marginBottom: 2,
  },
  scholarId: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  department: {
    fontSize: 14,
    color: '#999',
  },
  quickActions: {
    paddingHorizontal: 15,
  },
  actionCard: {
    marginBottom: 15,
    elevation: 3,
  },
  actionContent: {
    paddingVertical: 10,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  presentChip: {
    backgroundColor: '#E8F5E9',
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
  },
  markButton: {
    backgroundColor: '#6C63FF',
    marginTop: 5,
  },
  card: {
    margin: 15,
    marginTop: 0,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  percentageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  percentage: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  percentageLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
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
    marginTop: 5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  linkButton: {
    marginBottom: 10,
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

export default ScholarDashboard;
=======
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  card: { elevation: 3 },
  button: { marginTop: 20 },
});

export default ScholarDashboard;
>>>>>>> Stashed changes
