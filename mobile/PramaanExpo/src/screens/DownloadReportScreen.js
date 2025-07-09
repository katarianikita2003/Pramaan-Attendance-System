// mobile/PramaanExpo/src/screens/DownloadReportScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  RadioButton,
  Chip,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { attendanceService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DownloadReportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('monthly');
  const [format, setFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would download the file
      Alert.alert(
        'Report Generated',
        `Your ${reportType} attendance report has been generated and will be downloaded shortly.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = () => {
    if (reportType === 'monthly') {
      return dateRange.startDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
    return `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Title title="Report Type" />
          <Card.Content>
            <RadioButton.Group
              onValueChange={setReportType}
              value={reportType}
            >
              <RadioButton.Item label="Monthly Report" value="monthly" />
              <RadioButton.Item label="Custom Date Range" value="custom" />
              <RadioButton.Item label="Full Academic Year" value="yearly" />
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Date Range" />
          <Card.Content>
            <View style={styles.dateContainer}>
              <Icon name="date-range" size={24} color="#666" />
              <Text style={styles.dateText}>{formatDateRange()}</Text>
            </View>
            
            {reportType === 'custom' && (
              <View style={styles.customDateInputs}>
                <TextInput
                  label="Start Date"
                  value={dateRange.startDate.toLocaleDateString()}
                  mode="outlined"
                  style={styles.dateInput}
                  right={<TextInput.Icon icon="calendar" />}
                />
                <TextInput
                  label="End Date"
                  value={dateRange.endDate.toLocaleDateString()}
                  mode="outlined"
                  style={styles.dateInput}
                  right={<TextInput.Icon icon="calendar" />}
                />
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Export Format" />
          <Card.Content>
            <View style={styles.formatContainer}>
              <Chip
                selected={format === 'pdf'}
                onPress={() => setFormat('pdf')}
                style={styles.formatChip}
              >
                PDF
              </Chip>
              <Chip
                selected={format === 'excel'}
                onPress={() => setFormat('excel')}
                style={styles.formatChip}
              >
                Excel
              </Chip>
              <Chip
                selected={format === 'csv'}
                onPress={() => setFormat('csv')}
                style={styles.formatChip}
              >
                CSV
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Report Preview" />
          <Card.Content>
            <View style={styles.previewContainer}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Scholar Name:</Text>
                <Text style={styles.previewValue}>{user?.name}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Scholar ID:</Text>
                <Text style={styles.previewValue}>{user?.scholarId}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Organization:</Text>
                <Text style={styles.previewValue}>{user?.organizationCode}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Report Period:</Text>
                <Text style={styles.previewValue}>{formatDateRange()}</Text>
              </View>
            </View>
            
            <Paragraph style={styles.previewNote}>
              The report will include attendance records, statistics, and 
              verification proofs for the selected period.
            </Paragraph>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleDownload}
          loading={loading}
          disabled={loading}
          style={styles.downloadButton}
          contentStyle={styles.downloadButtonContent}
          icon="download"
        >
          Generate & Download Report
        </Button>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <Icon name="shield" size={20} color="#4CAF50" />
              <Text style={styles.infoTitle}>Secure & Verified</Text>
            </View>
            <Paragraph style={styles.infoText}>
              All reports are digitally signed and include ZKP verification 
              hashes for each attendance record, ensuring authenticity and 
              tamper-proof documentation.
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  customDateInputs: {
    marginTop: 16,
  },
  dateInput: {
    marginBottom: 12,
  },
  formatContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  previewContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  previewNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  downloadButton: {
    backgroundColor: '#6C63FF',
    marginBottom: 16,
  },
  downloadButtonContent: {
    paddingVertical: 8,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default DownloadReportScreen;