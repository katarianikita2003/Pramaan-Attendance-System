import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Surface,
  useTheme,
  Divider,
  Chip,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface AttendanceRecord {
  _id: string;
  scholarId: string;
  timestamp: string;
  verified: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export default function AttendanceHistoryScreen() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const theme = useTheme();

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = await AsyncStorage.getItem('token');
      const userType = await AsyncStorage.getItem('userType');
      
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      let response;

      if (userType === 'admin') {
        // For admin, fetch all attendance records
        response = await api.get('/attendance/organization', { headers });
      } else {
        // For scholar, fetch personal attendance
        response = await api.get('/attendance/scholar', { headers });
      }

      setAttendance(response.data.attendance || []);
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError(err.response?.data?.error || 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading attendance history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (attendance.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No attendance records found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header}>
        <Title>Attendance History</Title>
        <Paragraph>Total Records: {attendance.length}</Paragraph>
      </Surface>

      {attendance.map((record) => (
        <Card key={record._id} style={styles.card}>
          <Card.Content>
            <View style={styles.recordHeader}>
              <Text style={styles.dateText}>
                {formatDate(record.timestamp)}
              </Text>
              <Chip
                mode="flat"
                textStyle={{ color: 'white' }}
                style={[
                  styles.statusChip,
                  { backgroundColor: record.verified ? '#4CAF50' : '#FFC107' }
                ]}
              >
                {record.verified ? 'Verified' : 'Pending'}
              </Chip>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.details}>
              <Text style={styles.detailText}>
                Scholar ID: {record.scholarId}
              </Text>
              {record.location && (
                <Text style={styles.detailText}>
                  Location: {record.location.latitude.toFixed(6)}, {record.location.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    elevation: 4,
    marginBottom: 10,
  },
  card: {
    margin: 10,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 10,
  },
  details: {
    gap: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});