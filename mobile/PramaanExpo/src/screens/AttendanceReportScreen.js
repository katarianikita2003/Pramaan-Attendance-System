// mobile/PramaanExpo/src/screens/AttendanceReportScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  Card,
  DataTable,
  Chip,
  Button,
  Searchbar,
  // Remove Portal and Dialog imports
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
// Temporarily comment out until installed
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import * as MailComposer from 'expo-mail-composer';

export default function AttendanceReportScreen() {
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [emailAddress, setEmailAddress] = useState('');
  const [exportEmailAddress, setExportEmailAddress] = useState('');

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  useEffect(() => {
    filterData();
  }, [searchQuery, attendanceData]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await api.get(`/attendance/report?date=${dateStr}`);
      setAttendanceData(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch attendance data');
    }
    setLoading(false);
  };

  const filterData = () => {
    const filtered = attendanceData.filter(record =>
      record.scholarName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.scholarId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const exportReport = async () => {
    Alert.alert(
      'Export Report',
      'Select export format:',
      [
        { text: 'PDF', onPress: () => performExport('pdf') },
        { text: 'CSV', onPress: () => performExport('csv') },
        { text: 'Excel', onPress: () => performExport('excel') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const performExport = async (format) => {
    setLoading(true);
    try {
      // Temporarily disabled until expo-file-system is installed
      Alert.alert('Info', 'Export functionality will be enabled soon');
      
      /*
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await api.get(`/attendance/export?date=${dateStr}&format=${format}`, {
        responseType: 'blob'
      });

      const fileName = `attendance_report_${dateStr}.${format}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Save file
      await FileSystem.writeAsStringAsync(fileUri, response.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }

      Alert.alert('Success', 'Report exported successfully');
      */
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
    setLoading(false);
  };

  const emailReport = () => {
    Alert.prompt(
      'Email Report',
      'Enter email address:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: async (email) => {
            if (email && email.includes('@')) {
              await sendEmailReport(email);
            } else {
              Alert.alert('Invalid Email', 'Please enter a valid email address');
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const sendEmailReport = async (email) => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await api.post('/attendance/email-report', {
        email: email,
        date: dateStr,
        format: 'pdf'
      });
      Alert.alert('Success', 'Report sent successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to send report');
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return '#10B981';
      case 'Absent':
        return '#EF4444';
      case 'Late':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Attendance Report" />
        <Card.Content>
          {/* Date Picker */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setSelectedDate(date);
                }
              }}
            />
          )}

          {/* Search Bar */}
          <Searchbar
            placeholder="Search by name or ID"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />

          {/* Export Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={exportReport}>
              <Chip icon="download" style={styles.actionChip}>
                Export
              </Chip>
            </TouchableOpacity>
            <TouchableOpacity onPress={emailReport}>
              <Chip icon="email" style={styles.actionChip}>
                Email Report
              </Chip>
            </TouchableOpacity>
          </View>

          {/* Attendance Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {filteredData.filter(r => r.status === 'Present').length}
              </Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {filteredData.filter(r => r.status === 'Absent').length}
              </Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {filteredData.filter(r => r.status === 'Late').length}
              </Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
          </View>

          {/* Data Table */}
          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>ID</DataTable.Title>
                <DataTable.Title>Name</DataTable.Title>
                <DataTable.Title>Check In</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              {filteredData.map((record, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>{record.scholarId}</DataTable.Cell>
                  <DataTable.Cell>{record.scholarName}</DataTable.Cell>
                  <DataTable.Cell>{record.checkIn || '-'}</DataTable.Cell>
                  <DataTable.Cell>
                    <Chip
                      style={{
                        backgroundColor: getStatusColor(record.status),
                      }}
                      textStyle={{ color: 'white' }}
                    >
                      {record.status}
                    </Chip>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  dateButton: {
    backgroundColor: '#E5E7EB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
    backgroundColor: '#F9FAFB',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  actionChip: {
    backgroundColor: '#E5E7EB',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  loader: {
    marginVertical: 32,
  },
});