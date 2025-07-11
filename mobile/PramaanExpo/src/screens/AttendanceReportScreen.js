// mobile/PramaanExpo/src/screens/AttendanceReportScreen.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Card,
  Button,
  Chip,
  RadioButton,
  ProgressBar,
  DataTable,
  Portal,
  Dialog,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
// Remove expo-sharing and other missing dependencies
// import DateTimePicker from '@react-native-community/datetimepicker';
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
import { attendanceService } from '../services/api';

const AttendanceReportScreen = ({ navigation, route }) => {
  const { reportType = 'monthly' } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });
  const [reportData, setReportData] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  useEffect(() => {
    generateReport();
  }, [dateRange]);

  const generateReport = async () => {
    try {
      setLoading(true);
      
      // Mock data for now since backend might not be fully implemented
      const mockData = {
        summary: {
          totalDays: 30,
          presentDays: 25,
          absentDays: 5,
          attendancePercentage: 83.3,
        },
        records: [
          {
            date: '2024-01-15',
            status: 'present',
            checkIn: '09:00 AM',
            checkOut: '05:00 PM',
          },
          {
            date: '2024-01-14',
            status: 'present',
            checkIn: '09:15 AM',
            checkOut: '05:00 PM',
          },
          // Add more mock records as needed
        ],
      };
      
      setReportData(mockData);
      
      // Uncomment when backend is ready:
      // const response = await attendanceService.generateReport({
      //   startDate: dateRange.startDate.toISOString(),
      //   endDate: dateRange.endDate.toISOString(),
      //   type: reportType,
      // });
      // if (response.success) {
      //   setReportData(response.data);
      // }
    } catch (error) {
      console.error('Generate report error:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // For now, just show a success message
      Alert.alert(
        'Export Coming Soon',
        `Report export in ${exportFormat.toUpperCase()} format will be available soon.`
      );
      
      // TODO: Implement actual export when expo-sharing is installed
      // const response = await attendanceService.exportReport({
      //   startDate: dateRange.startDate.toISOString(),
      //   endDate: dateRange.endDate.toISOString(),
      //   format: exportFormat,
      // });
      // if (response.success) {
      //   const fileUri = FileSystem.documentDirectory + `attendance_report.${exportFormat}`;
      //   await FileSystem.downloadAsync(response.fileUrl, fileUri);
      //   if (await Sharing.isAvailableAsync()) {
      //     await Sharing.shareAsync(fileUri);
      //   } else {
      //     Alert.alert('Success', 'Report saved to device');
      //   }
      // }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setLoading(false);
      setShowExportDialog(false);
    }
  };

  const handleEmailReport = async () => {
    if (!emailAddress) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      
      // For now, just show a success message
      Alert.alert(
        'Email Coming Soon',
        `Report will be emailed to ${emailAddress} when this feature is implemented.`
      );
      
      // TODO: Implement actual email functionality
      // const response = await attendanceService.emailReport({
      //   startDate: dateRange.startDate.toISOString(),
      //   endDate: dateRange.endDate.toISOString(),
      //   email: emailAddress,
      // });
      // if (response.success) {
      //   Alert.alert('Success', 'Report has been emailed');
      // }
    } catch (error) {
      console.error('Email error:', error);
      Alert.alert('Error', 'Failed to email report');
    } finally {
      setLoading(false);
      setEmailDialog(false);
      setEmailAddress('');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Report</Text>
        <TouchableOpacity onPress={() => setShowExportDialog(true)}>
          <Icon name="file-download" size={24} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Date Range Selector */}
        <Card style={styles.dateCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Report Period</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => Alert.alert('Date Picker', 'Date picker will be available soon')}
              >
                <Text style={styles.dateLabel}>From</Text>
                <Text style={styles.dateText}>{formatDate(dateRange.startDate)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => Alert.alert('Date Picker', 'Date picker will be available soon')}
              >
                <Text style={styles.dateLabel}>To</Text>
                <Text style={styles.dateText}>{formatDate(dateRange.endDate)}</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Summary Card */}
        {reportData && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{reportData.summary.totalDays}</Text>
                  <Text style={styles.summaryLabel}>Total Days</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#27AE60' }]}>
                    {reportData.summary.presentDays}
                  </Text>
                  <Text style={styles.summaryLabel}>Present</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#E74C3C' }]}>
                    {reportData.summary.absentDays}
                  </Text>
                  <Text style={styles.summaryLabel}>Absent</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#6C63FF' }]}>
                    {reportData.summary.attendancePercentage}%
                  </Text>
                  <Text style={styles.summaryLabel}>Attendance</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Records Table */}
        {reportData && reportData.records && (
          <Card style={styles.tableCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>Attendance Records</Text>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Date</DataTable.Title>
                  <DataTable.Title>Status</DataTable.Title>
                  <DataTable.Title>Check In</DataTable.Title>
                  <DataTable.Title>Check Out</DataTable.Title>
                </DataTable.Header>

                {reportData.records.map((record, index) => (
                  <DataTable.Row key={index}>
                    <DataTable.Cell>{record.date}</DataTable.Cell>
                    <DataTable.Cell>
                      <Chip 
                        mode="outlined" 
                        style={[
                          styles.statusChip,
                          { 
                            backgroundColor: record.status === 'present' ? '#E8F5E8' : '#FFF5F5',
                            borderColor: record.status === 'present' ? '#27AE60' : '#E74C3C'
                          }
                        ]}
                      >
                        {record.status}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell>{record.checkIn || '-'}</DataTable.Cell>
                    <DataTable.Cell>{record.checkOut || '-'}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ProgressBar indeterminate color="#6C63FF" />
            <Text style={styles.loadingText}>Generating report...</Text>
          </View>
        )}
      </ScrollView>

      {/* Export Dialog */}
      <Portal>
        <Dialog visible={showExportDialog} onDismiss={() => setShowExportDialog(false)}>
          <Dialog.Title>Export Report</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Select Format:</Text>
            <RadioButton.Group
              onValueChange={setExportFormat}
              value={exportFormat}
            >
              <RadioButton.Item label="PDF" value="pdf" />
              <RadioButton.Item label="Excel" value="excel" />
              <RadioButton.Item label="CSV" value="csv" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowExportDialog(false)}>Cancel</Button>
            <Button onPress={handleExport} loading={loading}>Export</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Email Dialog */}
        <Dialog visible={emailDialog} onDismiss={() => setEmailDialog(false)}>
          <Dialog.Title>Email Report</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Email Address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEmailDialog(false)}>Cancel</Button>
            <Button onPress={handleEmailReport} loading={loading}>Send Email</Button>
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
  content: {
    flex: 1,
    padding: 16,
  },
  dateCard: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tableCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statusChip: {
    height: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  dialogLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
});

export default AttendanceReportScreen;