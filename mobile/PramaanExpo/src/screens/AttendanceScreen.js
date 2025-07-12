// mobile/PramaanExpo/src/screens/AttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  Card,
  Button,
  Searchbar,
  DataTable,
  FAB,
  Chip,
  // Remove Portal and Dialog imports
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import FaceCaptureModal from '../components/FaceCaptureModal';

export default function AttendanceScreen({ navigation }) {
  const [scholars, setScholars] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureMode, setCaptureMode] = useState('checkin');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualId, setManualId] = useState('');

  useEffect(() => {
    fetchScholars();
    fetchTodayAttendance();
  }, []);

  const fetchScholars = async () => {
    try {
      const response = await api.get('/scholars');
      setScholars(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch scholars');
    }
  };

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/attendance?date=${today}`);
      setAttendanceRecords(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch attendance records');
    }
    setLoading(false);
  };

  const handleCheckIn = (scholar) => {
    setSelectedScholar(scholar);
    setCaptureMode('checkin');
    setShowCaptureModal(true);
  };

  const handleCheckOut = (scholar) => {
    setSelectedScholar(scholar);
    setCaptureMode('checkout');
    setShowCaptureModal(true);
  };

  const handleCapture = async (imageData) => {
    setShowCaptureModal(false);
    setLoading(true);

    try {
      const endpoint = captureMode === 'checkin' ? '/attendance/checkin' : '/attendance/checkout';
      
      await api.post(endpoint, {
        scholarId: selectedScholar.id,
        timestamp: new Date().toISOString(),
        biometricData: imageData.base64,
        location: {
          latitude: 0, // Add actual location if needed
          longitude: 0
        }
      });

      Alert.alert(
        'Success',
        `${captureMode === 'checkin' ? 'Check-in' : 'Check-out'} recorded successfully`
      );
      
      fetchTodayAttendance();
    } catch (error) {
      Alert.alert('Error', `Failed to record ${captureMode}`);
    }
    
    setLoading(false);
  };

  const handleManualEntry = () => {
    setShowManualModal(true);
  };

  const submitManualEntry = async () => {
    if (!manualId.trim()) {
      Alert.alert('Error', 'Please enter a scholar ID');
      return;
    }

    setShowManualModal(false);
    setLoading(true);

    try {
      const scholar = scholars.find(s => s.id === manualId);
      if (!scholar) {
        Alert.alert('Error', 'Scholar not found');
        setLoading(false);
        return;
      }

      await api.post('/attendance/manual', {
        scholarId: manualId,
        timestamp: new Date().toISOString(),
        reason: 'Manual entry'
      });

      Alert.alert('Success', 'Manual attendance recorded');
      setManualId('');
      fetchTodayAttendance();
    } catch (error) {
      Alert.alert('Error', 'Failed to record manual attendance');
    }
    
    setLoading(false);
  };

  const getAttendanceStatus = (scholarId) => {
    const record = attendanceRecords.find(r => r.scholarId === scholarId);
    if (!record) return 'absent';
    if (record.checkOut) return 'completed';
    return 'checkedIn';
  };

  const filteredScholars = scholars.filter(scholar =>
    scholar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scholar.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Today's Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Icon name="account-check" size={24} color="#10B981" />
                <Text style={styles.statValue}>{attendanceRecords.length}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="account-remove" size={24} color="#EF4444" />
                <Text style={styles.statValue}>
                  {scholars.length - attendanceRecords.length}
                </Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="clock-alert" size={24} color="#F59E0B" />
                <Text style={styles.statValue}>
                  {attendanceRecords.filter(r => r.isLate).length}
                </Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Searchbar
          placeholder="Search scholars..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <Card style={styles.listCard}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Scholar</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
                <DataTable.Title>Actions</DataTable.Title>
              </DataTable.Header>

              {filteredScholars.map((scholar) => {
                const status = getAttendanceStatus(scholar.id);
                return (
                  <DataTable.Row key={scholar.id}>
                    <DataTable.Cell>
                      <View>
                        <Text style={styles.scholarName}>{scholar.name}</Text>
                        <Text style={styles.scholarId}>{scholar.id}</Text>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <Chip
                        style={[
                          styles.statusChip,
                          status === 'completed' && styles.completedChip,
                          status === 'checkedIn' && styles.checkedInChip,
                          status === 'absent' && styles.absentChip,
                        ]}
                      >
                        {status === 'completed' && 'Completed'}
                        {status === 'checkedIn' && 'Checked In'}
                        {status === 'absent' && 'Absent'}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      {status === 'absent' && (
                        <TouchableOpacity
                          onPress={() => handleCheckIn(scholar)}
                          style={styles.actionButton}
                        >
                          <Icon name="login" size={20} color="#1E3A8A" />
                        </TouchableOpacity>
                      )}
                      {status === 'checkedIn' && (
                        <TouchableOpacity
                          onPress={() => handleCheckOut(scholar)}
                          style={styles.actionButton}
                        >
                          <Icon name="logout" size={20} color="#F59E0B" />
                        </TouchableOpacity>
                      )}
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
            </DataTable>
          </Card>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleManualEntry}
        label="Manual Entry"
      />

      {/* Face Capture Modal */}
      <FaceCaptureModal
        visible={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onCapture={handleCapture}
        mode={captureMode}
        scholarName={selectedScholar?.name}
      />

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Attendance Entry</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Scholar ID"
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => {
                  setShowManualModal(false);
                  setManualId('');
                }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={submitManualEntry}
              >
                Submit
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryCard: {
    margin: 16,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  searchBar: {
    margin: 16,
    elevation: 0,
    backgroundColor: '#FFFFFF',
  },
  listCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  scholarName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  scholarId: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusChip: {
    height: 28,
  },
  completedChip: {
    backgroundColor: '#10B981',
  },
  checkedInChip: {
    backgroundColor: '#3B82F6',
  },
  absentChip: {
    backgroundColor: '#EF4444',
  },
  actionButton: {
    padding: 8,
  },
  loader: {
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E3A8A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});