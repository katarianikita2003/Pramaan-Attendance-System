// mobile/PramaanExpo/src/screens/AttendanceHistoryScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const AttendanceHistoryScreen = ({ navigation }) => {
  // Dummy data for now
  const attendanceData = [
    {
      id: '1',
      date: new Date().toISOString(),
      checkIn: '09:00 AM',
      checkOut: '06:00 PM',
      status: 'present',
    },
  ];

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>
            {new Date(item.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              { backgroundColor: item.status === 'present' ? '#E8F5E9' : '#FFEBEE' },
            ]}
            textStyle={{
              color: item.status === 'present' ? '#4CAF50' : '#F44336',
            }}
          >
            {item.status}
          </Chip>
        </View>
        <View style={styles.timeContainer}>
          <View style={styles.timeItem}>
            <Icon name="login" size={20} color="#666" />
            <Text style={styles.timeText}>{item.checkIn}</Text>
          </View>
          <View style={styles.timeItem}>
            <Icon name="logout" size={20} color="#666" />
            <Text style={styles.timeText}>{item.checkOut || 'Not marked'}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
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

      <FlatList
        data={attendanceData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusChip: {
    height: 28,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default AttendanceHistoryScreen;