// mobile/PramaanExpo/src/screens/AttendanceHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Chip,
  FAB,
  Portal,
  Modal,
  Calendar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { attendanceService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AttendanceHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadAttendanceHistory();
  }, [selectedMonth]);

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getHistory({
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
      });
      
      if (response.success) {
        setHistory(response.history);
      }
    } catch (error) {
      console.error('Load history error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceHistory();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAttendanceItem = ({ item }) => (
    <Card style={styles.attendanceCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={styles.timeText}>Check-in: {formatTime(item.checkIn.time)}</Text>
          </View>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              item.status === 'present' ? styles.presentChip : styles.absentChip,
            ]}
          >
            {item.status}
          </Chip>
        </View>
        
        {item.checkOut && (
          <Text style={styles.checkOutText}>
            Check-out: {formatTime(item.checkOut.time)}
          </Text>
        )}
        
        <View style={styles.verificationInfo}>
          <Icon name="verified-user" size={16} color="#666" />
          <Text style={styles.verificationText}>
            Verified by {item.verificationMethod}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMonthSelector = () => (
    <TouchableOpacity
      style={styles.monthSelector}
      onPress={() => setShowCalendar(true)}
    >
      <Icon name="calendar-today" size={20} color="#666" />
      <Text style={styles.monthText}>
        {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </Text>
      <Icon name="arrow-drop-down" size={24} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderMonthSelector()}

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {history.filter(h => h.status === 'present').length}
          </Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {history.filter(h => h.status === 'absent').length}
          </Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {history.filter(h => h.status === 'late').length}
          </Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item._id || item.date}
        renderItem={renderAttendanceItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No attendance records found</Text>
          </View>
        }
      />

      <FAB
        icon="download"
        style={styles.fab}
        onPress={() => navigation.navigate('DownloadReport')}
        label="Export"
      />

      <Portal>
        <Modal
          visible={showCalendar}
          onDismiss={() => setShowCalendar(false)}
          contentContainerStyle={styles.calendarModal}
        >
          <Title>Select Month</Title>
          {/* Add month/year picker here */}
          <TouchableOpacity
            style={styles.monthOption}
            onPress={() => {
              setSelectedMonth(new Date());
              setShowCalendar(false);
            }}
          >
            <Text>Current Month</Text>
          </TouchableOpacity>
        </Modal>
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
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 1,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 80,
  },
  attendanceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkOutText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verificationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
  calendarModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  monthOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

export default AttendanceHistoryScreen;