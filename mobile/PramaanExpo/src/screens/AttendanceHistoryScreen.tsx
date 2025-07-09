// src/screens/AttendanceHistoryScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Surface,
  useTheme,
  Divider,
  Chip,
  Button,
  IconButton,
  Portal,
  Modal,
  Searchbar,
  Menu,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';

interface AttendanceRecord {
  _id: string;
  scholarId: string;
  scholarName?: string;
  timestamp: string;
  verified: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
  proof?: string;
  zkpCommitment?: string;
}

export default function AttendanceHistoryScreen() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all'); // all, verified, pending
  const [userType, setUserType] = useState('');
  const theme = useTheme();

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  useEffect(() => {
    filterAttendance();
  }, [searchQuery, currentFilter, attendance]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = await AsyncStorage.getItem('token');
      const type = await AsyncStorage.getItem('userType');
      setUserType(type || '');
      
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      let response;

      if (type === 'admin') {
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
      setRefreshing(false);
    }
  };

  const filterAttendance = () => {
    let filtered = [...attendance];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(record =>
        record.scholarName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.scholarId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(record.timestamp).toLocaleDateString().includes(searchQuery)
      );
    }

    // Apply status filter
    if (currentFilter === 'verified') {
      filtered = filtered.filter(record => record.verified);
    } else if (currentFilter === 'pending') {
      filtered = filtered.filter(record => !record.verified);
    }

    setFilteredAttendance(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceHistory();
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

  const handleViewProof = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowProofModal(true);
  };

  const handleDownloadProof = async (record: AttendanceRecord) => {
    try {
      // In a real app, implement actual download functionality
      Alert.alert('Success', 'Attendance proof has been saved to your device');
    } catch (error) {
      Alert.alert('Error', 'Failed to download proof');
    }
  };

  const handleShareProof = async (record: AttendanceRecord) => {
    try {
      // In a real app, implement share functionality
      Alert.alert('Share', 'Share functionality will be implemented soon');
    } catch (error) {
      Alert.alert('Error', 'Failed to share proof');
    }
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const verified = attendance.filter(r => r.verified).length;
    const pending = total - verified;
    const rate = total > 0 ? Math.round((verified / total) * 100) : 0;

    return { total, verified, pending, rate };
  };

  const stats = getAttendanceStats();

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
        <Button mode="contained" onPress={fetchAttendanceHistory} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header}>
        <Title>Attendance History</Title>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <Divider style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#27AE60' }]}>{stats.verified}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <Divider style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F39C12' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <Divider style={styles.verticalDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#6C63FF' }]}>{stats.rate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      </Surface>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name, ID, or date..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter"
              onPress={() => setFilterMenuVisible(true)}
              style={styles.filterButton}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setCurrentFilter('all');
              setFilterMenuVisible(false);
            }}
            title="All Records"
            leadingIcon={currentFilter === 'all' ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => {
              setCurrentFilter('verified');
              setFilterMenuVisible(false);
            }}
            title="Verified Only"
            leadingIcon={currentFilter === 'verified' ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => {
              setCurrentFilter('pending');
              setFilterMenuVisible(false);
            }}
            title="Pending Only"
            leadingIcon={currentFilter === 'pending' ? 'check' : undefined}
          />
        </Menu>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredAttendance.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {searchQuery || currentFilter !== 'all'
                  ? 'No records found matching your criteria'
                  : 'No attendance records found'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredAttendance.map((record) => (
            <Card key={record._id} style={styles.card}>
              <Card.Content>
                <View style={styles.recordHeader}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.dateText}>
                      {formatDate(record.timestamp)}
                    </Text>
                    {userType === 'admin' && (
                      <Text style={styles.scholarText}>
                        {record.scholarName || 'Unknown'} ({record.scholarId})
                      </Text>
                    )}
                  </View>
                  <Chip
                    mode="flat"
                    textStyle={{ color: 'white', fontSize: 12 }}
                    style={[
                      styles.statusChip,
                      { backgroundColor: record.verified ? '#27AE60' : '#FFC107' }
                    ]}
                  >
                    {record.verified ? 'Verified' : 'Pending'}
                  </Chip>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.details}>
                  {record.location && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailText}>
                        {record.location.latitude.toFixed(6)}, {record.location.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Proof Type:</Text>
                    <Text style={styles.detailText}>Zero-Knowledge Proof</Text>
                  </View>
                  {record.zkpCommitment && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Commitment:</Text>
                      <Text style={styles.detailText} numberOfLines={1}>
                        {record.zkpCommitment.substring(0, 20)}...
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actions}>
                  <Button
                    mode="text"
                    icon="qrcode"
                    onPress={() => handleViewProof(record)}
                    compact
                  >
                    View Proof
                  </Button>
                  <Button
                    mode="text"
                    icon="download"
                    onPress={() => handleDownloadProof(record)}
                    compact
                  >
                    Download
                  </Button>
                  <Button
                    mode="text"
                    icon="share"
                    onPress={() => handleShareProof(record)}
                    compact
                  >
                    Share
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showProofModal}
          onDismiss={() => {
            setShowProofModal(false);
            setSelectedRecord(null);
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Title style={styles.modalTitle}>Attendance Proof</Title>
          {selectedRecord && (
            <>
              <View style={styles.qrContainer}>
                <QRCode
                  value={JSON.stringify({
                    id: selectedRecord._id,
                    timestamp: selectedRecord.timestamp,
                    verified: selectedRecord.verified,
                    commitment: selectedRecord.zkpCommitment,
                  })}
                  size={200}
                  backgroundColor="white"
                />
              </View>
              <Surface style={styles.proofDetails}>
                <Text style={styles.proofLabel}>Proof ID:</Text>
                <Text style={styles.proofValue}>{selectedRecord._id}</Text>
                
                <Text style={styles.proofLabel}>Date & Time:</Text>
                <Text style={styles.proofValue}>{formatDate(selectedRecord.timestamp)}</Text>
                
                <Text style={styles.proofLabel}>Status:</Text>
                <Chip
                  mode="flat"
                  textStyle={{ color: 'white' }}
                  style={{ backgroundColor: selectedRecord.verified ? '#27AE60' : '#FFC107' }}
                >
                  {selectedRecord.verified ? 'Verified' : 'Pending Verification'}
                </Chip>
              </Surface>
              <Button
                mode="contained"
                onPress={() => setShowProofModal(false)}
                style={styles.modalButton}
              >
                Close
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
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
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  searchbar: {
    flex: 1,
    elevation: 2,
  },
  filterButton: {
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scholarText: {
    fontSize: 14,
    color: '#666',
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 8,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
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
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  emptyCard: {
    marginTop: 50,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
  },
  proofDetails: {
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  proofLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  proofValue: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalButton: {
    minWidth: 120,
  },
});