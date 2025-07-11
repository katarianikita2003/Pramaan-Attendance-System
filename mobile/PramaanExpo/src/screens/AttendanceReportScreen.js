// mobile/PramaanExpo/src/screens/AttendanceReportScreen.js
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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { attendanceService } from '../services/api';

const AttendanceReportScreen = ({ navigation, route }) => {
  const { reportType = 'monthly' } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
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
      const response = await attendanceService.generateReport({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        type: reportType,
      });

      if (response.success) {
        setReportData(response.data);
      }
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
      
      const response = await attendanceService.exportReport({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format: exportFormat,
      });

      if (response.success) {
        // Download file
        const fileUri = FileSystem.documentDirectory + `attendance_report.${exportFormat}`;
        await FileSystem.downloadAsync(response.fileUrl, fileUri);
        
        // Share file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Success', 'Report saved to device');
        }
      }
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
      const response = await attendanceService.emailReport({
        email: emailAddress,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format: 'pdf',
      });

      if (response.success) {
        Alert.alert('Success', 'Report sent to your email');
        setEmailDialog(false);
        setEmailAddress('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send report');
    } finally {
      setLoading(false);
    }
  };

  const renderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <Card.Title title="Report Summary" />
      <Card.Content>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Period:</Text>
          <Text style={styles.summaryValue}>
            {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Days:</Text>
          <Text style={styles.summaryValue}>{reportData?.totalDays || 0}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Present Days:</Text>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            {reportData?.presentDays || 0}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Absent Days:</Text>
          <Text style={[styles.summaryValue, { color: '#FF5252' }]}>
            {reportData?.absentDays || 0}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Attendance Rate:</Text>
          <Text style={styles.summaryValue}>
            {reportData?.attendanceRate || 0}%
          </Text>
        </View>
        
        <ProgressBar
          progress={(reportData?.attendanceRate || 0) / 100}
          color="#4CAF50"
          style={styles.progressBar}
        />
      </Card.Content>
    </Card>
  );

  const renderDetailsTable = () => (
    <Card style={styles.tableCard}>
      <Card.Title title="Attendance Details" />
      <ScrollView horizontal>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={styles.dateColumn}>Date</DataTable.Title>
            <DataTable.Title>Day</DataTable.Title>
            <DataTable.Title>Status</DataTable.Title>
            <DataTable.Title>Time</DataTable.Title>
            <DataTable.Title>Location</DataTable.Title>
          </DataTable.Header>

          {reportData?.details?.map((item, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell style={styles.dateColumn}>
                {new Date(item.date).toLocaleDateString()}
              </DataTable.Cell>
              <DataTable.Cell>
                {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </DataTable.Cell>
              <DataTable.Cell>
                <Chip
                  mode="flat"
                  style={item.status === 'present' ? styles.presentChip : styles.absentChip}
                  textStyle={styles.chipText}
                >
                  {item.status}
                </Chip>
              </DataTable.Cell>
              <DataTable.Cell>
                {item.checkInTime || '-'}
              </DataTable.Cell>
              <DataTable.Cell>
                {item.location || '-'}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </ScrollView>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Report</Text>
        <IconButton
          icon="share"
          onPress={() => setShowExportDialog(true)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Range Selector */}
        <Card style={styles.dateCard}>
          <Card.Content>
            <Text style={styles.dateLabel}>Select Date Range</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Icon name="calendar-today" size={20} color="#6C63FF" />
                <Text style={styles.dateText}>
                  {dateRange.startDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.dateSeparator}>to</Text>
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Icon name="calendar-today" size={20} color="#6C63FF" />
                <Text style={styles.dateText}>
                  {dateRange.endDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickFilters}>
              <Chip
                mode="outlined"
                onPress={() => {
                  const today = new Date();
                  setDateRange({
                    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
                    endDate: today,
                  });
                }}
                style={styles.filterChip}
              >
                This Month
              </Chip>
              <Chip
                mode="outlined"
                onPress={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                  setDateRange({
                    startDate: lastMonth,
                    endDate: lastMonthEnd,
                  });
                }}
                style={styles.filterChip}
              >
                Last Month
              </Chip>
              <Chip
                mode="outlined"
                onPress={() => {
                  const today = new Date();
                  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                  setDateRange({
                    startDate: threeMonthsAgo,
                    endDate: today,
                  });
                }}
                style={styles.filterChip}
              >
                Last 3 Months
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Report Content */}
        {reportData && (
          <>
            {renderSummaryCard()}
            {renderDetailsTable()}
            
            {/* Actions */}
            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="download"
                onPress={() => setShowExportDialog(true)}
                style={styles.actionButton}
              >
                Download Report
              </Button>
              
              <Button
                mode="outlined"
                icon="email"
                onPress={() => setEmailDialog(true)}
                style={styles.actionButton}
              >
                Email Report
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={dateRange.startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) {
              setDateRange({ ...dateRange, startDate: selectedDate });
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={dateRange.endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) {
              setDateRange({ ...dateRange, endDate: selectedDate });
            }
          }}
        />
      )}

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
            <Button onPress={handleEmailReport} loading={loading}>Send</Button>
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
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  dateCard: {
    margin: 16,
    elevation: 2,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  dateSeparator: {
    fontSize: 16,
    color: '#666',
  },
  quickFilters: {
    flexDirection: 'row',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressBar: {
    marginTop: 16,
    height: 8,
    borderRadius: 4,
  },
  tableCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  dateColumn: {
    width: 100,
  },
  presentChip: {
    backgroundColor: '#E8F5E9',
  },
  absentChip: {
    backgroundColor: '#FFEBEE',
  },
  chipText: {
    fontSize: 12,
  },
  actions: {
    paddingHorizontal: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  dialogLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
});

export default AttendanceReportScreen;
