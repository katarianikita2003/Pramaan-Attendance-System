// mobile/PramaanExpo/src/screens/ReportsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Button,
  DataTable,
  Searchbar,
  Chip,
  List,
  Divider,
  // Remove Portal and Modal imports
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const reportTypes = [
    { id: 'attendance', title: 'Attendance Report', icon: 'calendar-check' },
    { id: 'scholar', title: 'Scholar Report', icon: 'account-details' },
    { id: 'department', title: 'Department Report', icon: 'office-building' },
    { id: 'monthly', title: 'Monthly Summary', icon: 'calendar-month' },
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await api.post('/reports/generate', {
        type: reportType,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      setReportData(response.data);
      Alert.alert('Success', 'Report generated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    }
    setLoading(false);
  };

  const exportReport = async (format) => {
    Alert.alert(
      'Export Report',
      `Export report as ${format.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              await api.post('/reports/export', {
                reportId: reportData.id,
                format: format,
              });
              Alert.alert('Success', `Report exported as ${format.toUpperCase()}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to export report');
            }
          },
        },
      ]
    );
  };

  const shareReport = async () => {
    Alert.alert(
      'Share Report',
      'Choose sharing method:',
      [
        { text: 'Email', onPress: () => shareViaEmail() },
        { text: 'WhatsApp', onPress: () => shareViaWhatsApp() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const shareViaEmail = async () => {
    Alert.prompt(
      'Email Report',
      'Enter recipient email:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (email) => {
            if (email && email.includes('@')) {
              try {
                await api.post('/reports/share', {
                  reportId: reportData.id,
                  method: 'email',
                  recipient: email,
                });
                Alert.alert('Success', 'Report sent via email');
              } catch (error) {
                Alert.alert('Error', 'Failed to send report');
              }
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

  const shareViaWhatsApp = async () => {
    Alert.alert('Info', 'WhatsApp sharing coming soon');
  };

  const renderReportTypeCard = (type) => (
    <TouchableOpacity
      key={type.id}
      onPress={() => setReportType(type.id)}
      style={[
        styles.reportTypeCard,
        reportType === type.id && styles.selectedReportType,
      ]}
    >
      <Icon
        name={type.icon}
        size={32}
        color={reportType === type.id ? '#FFFFFF' : '#1E3A8A'}
      />
      <Text
        style={[
          styles.reportTypeText,
          reportType === type.id && styles.selectedReportTypeText,
        ]}
      >
        {type.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Report Type Selection */}
      <Card style={styles.card}>
        <Card.Title title="Select Report Type" />
        <Card.Content>
          <View style={styles.reportTypeGrid}>
            {reportTypes.map(renderReportTypeCard)}
          </View>
        </Card.Content>
      </Card>

      {/* Date Range Selection */}
      <Card style={styles.card}>
        <Card.Title title="Date Range" />
        <Card.Content>
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Icon name="calendar" size={20} color="#6B7280" />
              <Text style={styles.dateText}>
                From: {dateRange.start.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Icon name="calendar" size={20} color="#6B7280" />
              <Text style={styles.dateText}>
                To: {dateRange.end.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={dateRange.start}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartPicker(false);
                if (date) {
                  setDateRange({ ...dateRange, start: date });
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={dateRange.end}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowEndPicker(false);
                if (date) {
                  setDateRange({ ...dateRange, end: date });
                }
              }}
            />
          )}

          <Button
            mode="contained"
            onPress={generateReport}
            loading={loading}
            style={styles.generateButton}
          >
            Generate Report
          </Button>
        </Card.Content>
      </Card>

      {/* Report Results */}
      {reportData && (
        <Card style={styles.card}>
          <Card.Title
            title="Report Results"
            right={(props) => (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => exportReport('pdf')}
                  style={styles.actionButton}
                >
                  <Icon name="file-pdf-box" size={24} color="#DC2626" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => exportReport('excel')}
                  style={styles.actionButton}
                >
                  <Icon name="file-excel" size={24} color="#059669" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={shareReport}
                  style={styles.actionButton}
                >
                  <Icon name="share-variant" size={24} color="#1E3A8A" />
                </TouchableOpacity>
              </View>
            )}
          />
          <Card.Content>
            {/* Report Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {reportData.summary?.totalScholars || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Scholars</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {reportData.summary?.averageAttendance || 0}%
                  </Text>
                  <Text style={styles.summaryLabel}>Avg Attendance</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {reportData.summary?.totalDays || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Days</Text>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Detailed Data */}
            <Searchbar
              placeholder="Search in report..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />

            {reportData.details && (
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Scholar</DataTable.Title>
                  <DataTable.Title numeric>Present</DataTable.Title>
                  <DataTable.Title numeric>Absent</DataTable.Title>
                  <DataTable.Title numeric>%</DataTable.Title>
                </DataTable.Header>

                {reportData.details
                  .filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item, index) => (
                    <DataTable.Row key={index}>
                      <DataTable.Cell>{item.name}</DataTable.Cell>
                      <DataTable.Cell numeric>{item.present}</DataTable.Cell>
                      <DataTable.Cell numeric>{item.absent}</DataTable.Cell>
                      <DataTable.Cell numeric>
                        {item.percentage}%
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
              </DataTable>
            )}
          </Card.Content>
        </Card>
      )}
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
  reportTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportTypeCard: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedReportType: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  reportTypeText: {
    marginTop: 8,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  selectedReportTypeText: {
    color: '#FFFFFF',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  generateButton: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  actionButton: {
    marginLeft: 12,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 0,
    backgroundColor: '#F9FAFB',
  },
});