import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Chip,
  FAB,
  Portal,
  Modal,
  Button,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'late' | 'absent' | 'holiday';
  duration: string;
}

const AttendanceHistoryScreen = ({ navigation }: any) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [filter, setFilter] = useState('all');
  
  // Sample data
  const attendanceData: AttendanceRecord[] = [
    {
      id: '1',
      date: '2024-01-15',
      checkIn: '09:00 AM',
      checkOut: '06:00 PM',
      status: 'present',
      duration: '9 hours',
    },
    {
      id: '2',
      date: '2024-01-14',
      checkIn: '10:30 AM',
      checkOut: '06:30 PM',
      status: 'late',
      duration: '8 hours',
    },
    {
      id: '3',
      date: '2024-01-13',
      checkIn: '-',
      checkOut: '-',
      status: 'absent',
      duration: '-',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#4CAF50';
      case 'late':
        return '#FF9800';
      case 'absent':
        return '#F44336';
      case 'holiday':
        return '#9C27B0';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'check-circle';
      case 'late':
        return 'clock-alert';
      case 'absent':
        return 'close-circle';
      case 'holiday':
        return 'beach';
      default:
        return 'help-circle';
    }
  };

  const markedDates = {
    '2024-01-15': { marked: true, dotColor: '#4CAF50' },
    '2024-01-14': { marked: true, dotColor: '#FF9800' },
    '2024-01-13': { marked: true, dotColor: '#F44336' },
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.attendanceCard}>
      <Card.Content>
        <View style={styles.attendanceHeader}>
          <View>
            <Text style={styles.dateText}>
              {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>In: {item.checkIn}</Text>
              <Text style={styles.timeSeparator}>|</Text>
              <Text style={styles.timeText}>Out: {item.checkOut}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <Chip
              icon={getStatusIcon(item.status)}
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Chip>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.summaryTitle}>This Month Summary</Title>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>22</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>3</Text>
              <Text style={styles.summaryLabel}>Late</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>2</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>88%</Text>
              <Text style={styles.summaryLabel}>Attendance</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
        >
          All
        </Chip>
        <Chip
          selected={filter === 'present'}
          onPress={() => setFilter('present')}
          style={styles.filterChip}
        >
          Present
        </Chip>
        <Chip
          selected={filter === 'late'}
          onPress={() => setFilter('late')}
          style={styles.filterChip}
        >
          Late
        </Chip>
        <Chip
          selected={filter === 'absent'}
          onPress={() => setFilter('absent')}
          style={styles.filterChip}
        >
          Absent
        </Chip>
      </ScrollView>

      {/* Attendance List */}
      <FlatList
        data={attendanceData}
        renderItem={renderAttendanceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {/* Calendar FAB */}
      <FAB
        style={styles.fab}
        icon="calendar"
        onPress={() => setShowCalendar(true)}
      />

      {/* Calendar Modal */}
      <Portal>
        <Modal
          visible={showCalendar}
          onDismiss={() => setShowCalendar(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title>Select Date</Title>
              <IconButton
                icon="close"
                onPress={() => setShowCalendar(false)}
              />
            </View>
            <Calendar
              markedDates={markedDates}
              onDayPress={(day: any) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              theme={{
                selectedDayBackgroundColor: '#6C63FF',
                todayTextColor: '#6C63FF',
                arrowColor: '#6C63FF',
              }}
            />
          </View>
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
  summaryCard: {
    margin: 15,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  filterContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterChip: {
    marginRight: 10,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 80,
  },
  attendanceCard: {
    marginBottom: 10,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  timeSeparator: {
    marginHorizontal: 10,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 5,
  },
  durationText: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
});

export default AttendanceHistoryScreen;