// mobile/PramaanExpo/src/screens/HistoryScreen.js
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
  Chip,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { scholarService } from '../services/api';

const HistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Make sure this is boolean
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setPage(1);
        setAttendanceHistory([]);
      }

      const response = await scholarService.getAttendanceHistory(
        isRefresh ? 1 : page,
        20
      );

      if (response.success && response.attendance) {
        if (isRefresh) {
          setAttendanceHistory(response.attendance);
        } else {
          setAttendanceHistory(prev => [...prev, ...response.attendance]);
        }
        
        setHasMore(response.attendance.length === 20);
        if (!isRefresh) {
          setPage(prev => prev + 1);
        }
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
    loadHistory(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadHistory();
    }
  };

  const renderItem = ({ item }) => {
    const attendanceDate = new Date(item.date);
    const isPresent = item.status === 'present';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.date}>
                {attendanceDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.time}>
                Check-in: {item.checkIn || 'N/A'} | Check-out: {item.checkOut || 'N/A'}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: isPresent ? '#E8F5E9' : '#FFEBEE' },
              ]}
              textStyle={{
                color: isPresent ? '#4CAF50' : '#F44336',
              }}
            >
              {item.status}
            </Chip>
          </View>
          
          {item.proofId && (
            <TouchableOpacity 
              style={styles.proofButton}
              onPress={() => navigation.navigate('VerifyProof', { proofId: item.proofId })}
            >
              <Icon name="verified" size={16} color="#6C63FF" />
              <Text style={styles.proofText}>View Proof</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="history" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No attendance history yet</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#6C63FF" />
      </View>
    );
  };

  if (loading && attendanceHistory.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

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
        data={attendanceHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item._id || `${item.date}-${item.type}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6C63FF']}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
      />

      <FAB
        style={styles.fab}
        icon="download"
        onPress={() => navigation.navigate('DownloadReport')}
        label="Download Report"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#666',
  },
  statusChip: {
    height: 28,
  },
  proofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  proofText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6C63FF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
});

export default HistoryScreen;