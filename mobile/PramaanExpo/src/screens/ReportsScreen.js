// mobile/PramaanExpo/src/screens/ReportsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  DataTable,
  Searchbar,
  Chip,
  FAB,
  Portal,
  Modal,
  RadioButton,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Remove DateTimePicker import - we'll use a custom solution
import { adminService } from '../services/api';

const ReportsScreen = ({ navigation, route }) => {
  const initialTab = route.params?.tab || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  
  // Data states
  const [overviewData, setOverviewData] = useState({
    totalScholars: 0,
    presentToday: 0,
    absentToday: 0,
    averageAttendance: 0,
  });
  const [scholars, setScholars] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
    department: 'all',
    status: 'all',
  });

  useEffect(() => {
    loadReportData();
  }, [activeTab, filters]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const response = await adminService.getDashboard();
        if (response.success) {
          setOverviewData(response.stats);
        }
      } else if (activeTab === 'scholars') {
        const response = await adminService.getScholars();
        if (response.success) {
          setScholars(response.scholars);
        }
      } else if (activeTab === 'attendance') {
        const response = await adminService.getAttendanceReports(filters);
        if (response.success) {
          setAttendanceRecords(response.records);
        }
      }
    } catch (error) {
      console.error('Load report data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReportData();
  };

  const handleDateChange = (selectedDate) => {
    setShowDateModal(false);
    if (selectedDate) {
      setFilters({
        ...filters,
        [datePickerMode === 'start' ? 'startDate' : 'endDate']: selectedDate,
      });
    }
  };

  // Simple date picker using TextInput
  const showDatePickerModal = (mode) => {
    setDatePickerMode(mode);
    setTempDate(filters[mode === 'start' ? 'startDate' : 'endDate']);
    setShowDateModal(true);
  };

  const filteredScholars = scholars.filter(scholar =>
    scholar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scholar.scholarId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <Card style={[styles.summaryCard, { borderTopColor: '#6C63FF' }]}>
          <Card.Content>
            <View style={styles.summaryContent}>
              <Icon name="people" size={32} color="#6C63FF" />
              <View style={styles.summaryText}>
                <Text style={styles.summaryValue}>{overviewData.totalScholars}</Text>
                <Text style={styles.summaryLabel}>Total Scholars</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { borderTopColor: '#4CAF50' }]}>
          <Card.Content>
            <View style={styles.summaryContent}>
              <Icon name="check-circle" size={32} color="#4CAF50" />
              <View style={styles.summaryText}>
                <Text style={styles.summaryValue}>{overviewData.presentToday}</Text>
                <Text style={styles.summaryLabel}>Present Today</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { borderTopColor: '#FF5252' }]}>
          <Card.Content>
            <View style={styles.summaryContent}>
              <Icon name="cancel" size={32} color="#FF5252" />
              <View style={styles.summaryText}>
                <Text style={styles.summaryValue}>{overviewData.absentToday}</Text>
                <Text style={styles.summaryLabel}>Absent Today</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, { borderTopColor: '#FF9800' }]}>
          <Card.Content>
            <View style={styles.summaryContent}>
              <Icon name="insights" size={32} color="#FF9800" />
              <View style={styles.summaryText}>
                <Text style={styles.summaryValue}>{overviewData.averageAttendance}%</Text>
                <Text style={styles.summaryLabel}>Avg Attendance</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Stats */}
      <Card style={styles.quickStatsCard}>
        <Card.Title title="This Week's Performance" />
        <Card.Content>
          <View style={styles.weekStats}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
              <View key={day} style={styles.dayColumn}>
                <View style={[styles.dayBar, { height: `${Math.random() * 80 + 20}%` }]} />
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderScholarsTab = () => (
    <View style={styles.tabContent}>
      <Searchbar
        placeholder="Search scholars..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <FlatList
        data={filteredScholars}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <Card style={styles.scholarCard}>
            <Card.Content>
              <View style={styles.scholarHeader}>
                <View style={styles.scholarInfo}>
                  <Text style={styles.scholarName}>{item.name}</Text>
                  <Text style={styles.scholarId}>ID: {item.scholarId}</Text>
                </View>
                <Chip
                  mode="flat"
                  style={item.presentToday ? styles.presentChip : styles.absentChip}
                >
                  {item.presentToday ? 'Present' : 'Absent'}
                </Chip>
              </View>
              
              <View style={styles.scholarStats}>
                <View style={styles.scholarStat}>
                  <Text style={styles.statLabel}>Attendance</Text>
                  <Text style={styles.statValue}>{item.attendancePercentage}%</Text>
                </View>
                <View style={styles.scholarStat}>
                  <Text style={styles.statLabel}>Total Days</Text>
                  <Text style={styles.statValue}>{item.totalDays}</Text>
                </View>
                <View style={styles.scholarStat}>
                  <Text style={styles.statLabel}>Department</Text>
                  <Text style={styles.statValue}>{item.department || 'N/A'}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No scholars found</Text>
          </View>
        }
      />
    </View>
  );

  const renderAttendanceTab = () => (
    <View style={styles.tabContent}>
      {/* Date Range Filter */}
      <Card style={styles.filterCard}>
        <Card.Content>
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerModal('start')}
            >
              <Icon name="calendar-today" size={20} color="#666" />
              <Text style={styles.dateText}>
                {filters.startDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.dateRangeSeparator}>to</Text>
            
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => showDatePickerModal('end')}
            >
              <Icon name="calendar-today" size={20} color="#666" />
              <Text style={styles.dateText}>
                {filters.endDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            
            <IconButton
              icon="filter-list"
              size={24}
              onPress={() => setShowFilterModal(true)}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Attendance Table */}
      <ScrollView horizontal>
        <DataTable style={styles.dataTable}>
          <DataTable.Header>
            <DataTable.Title style={styles.tableColumn}>Date</DataTable.Title>
            <DataTable.Title style={styles.tableColumn}>Scholar ID</DataTable.Title>
            <DataTable.Title style={styles.tableColumn}>Name</DataTable.Title>
            <DataTable.Title style={styles.tableColumn}>Time</DataTable.Title>
            <DataTable.Title style={styles.tableColumn}>Status</DataTable.Title>
          </DataTable.Header>

          {attendanceRecords.map((record, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell style={styles.tableColumn}>
                {new Date(record.date).toLocaleDateString()}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableColumn}>{record.scholarId}</DataTable.Cell>
              <DataTable.Cell style={styles.tableColumn}>{record.name}</DataTable.Cell>
              <DataTable.Cell style={styles.tableColumn}>{record.time}</DataTable.Cell>
              <DataTable.Cell style={styles.tableColumn}>
                <Chip
                  mode="flat"
                  compact
                  style={record.status === 'present' ? styles.presentChip : styles.absentChip}
                >
                  {record.status}
                </Chip>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <IconButton
          icon="download"
          size={24}
          onPress={() => {
            // Export functionality
          }}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scholars' && styles.activeTab]}
          onPress={() => setActiveTab('scholars')}
        >
          <Text style={[styles.tabText, activeTab === 'scholars' && styles.activeTabText]}>
            Scholars
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>
            Attendance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'scholars' && renderScholarsTab()}
      {activeTab === 'attendance' && renderAttendanceTab()}

      {/* Date Picker Modal */}
      <Portal>
        <Modal
          visible={showDateModal}
          onDismiss={() => setShowDateModal(false)}
          contentContainerStyle={styles.datePickerModal}
        >
          <Title>Select Date</Title>
          <TextInput
            label="Date (MM/DD/YYYY)"
            value={tempDate.toLocaleDateString()}
            mode="outlined"
            style={styles.dateInput}
            onChangeText={(text) => {
              // Simple date parsing
              const parts = text.split('/');
              if (parts.length === 3) {
                const newDate = new Date(parts[2], parts[0] - 1, parts[1]);
                if (!isNaN(newDate.getTime())) {
                  setTempDate(newDate);
                }
              }
            }}
          />
          <View style={styles.dateModalButtons}>
            <Button onPress={() => setShowDateModal(false)}>Cancel</Button>
            <Button onPress={() => handleDateChange(tempDate)}>OK</Button>
          </View>
        </Modal>
      </Portal>

      {/* Filter Modal */}
      <Portal>
        <Modal
          visible={showFilterModal}
          onDismiss={() => setShowFilterModal(false)}
          contentContainerStyle={styles.filterModal}
        >
          <Title>Filter Options</Title>
          
          <Text style={styles.filterLabel}>Department</Text>
          <RadioButton.Group
            onValueChange={(value) => setFilters({ ...filters, department: value })}
            value={filters.department}
          >
            <RadioButton.Item label="All Departments" value="all" />
            <RadioButton.Item label="Computer Science" value="cs" />
            <RadioButton.Item label="Engineering" value="eng" />
            <RadioButton.Item label="Business" value="bus" />
          </RadioButton.Group>
          
          <Text style={styles.filterLabel}>Status</Text>
          <RadioButton.Group
            onValueChange={(value) => setFilters({ ...filters, status: value })}
            value={filters.status}
          >
            <RadioButton.Item label="All" value="all" />
            <RadioButton.Item label="Present Only" value="present" />
            <RadioButton.Item label="Absent Only" value="absent" />
          </RadioButton.Group>
          
          <Button
            mode="contained"
            onPress={() => {
              setShowFilterModal(false);
              loadReportData();
            }}
            style={styles.applyFilterButton}
          >
            Apply Filters
          </Button>
        </Modal>
      </Portal>

      {/* FAB for Export */}
      <FAB
        icon="file-download"
        style={styles.fab}
        onPress={() => {
          // Export report functionality
        }}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#6C63FF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    marginBottom: 16,
    borderTopWidth: 4,
    elevation: 2,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    marginLeft: 12,
    flex: 1,
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
  quickStatsCard: {
    margin: 16,
    elevation: 2,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayBar: {
    width: '60%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 12,
    color: '#666',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  scholarCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  scholarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scholarInfo: {
    flex: 1,
  },
  scholarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scholarId: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  presentChip: {
    backgroundColor: '#E8F5E9',
  },
  absentChip: {
    backgroundColor: '#FFEBEE',
  },
  scholarStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  scholarStat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  filterCard: {
    margin: 16,
    elevation: 2,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    flex: 1,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  dateRangeSeparator: {
    marginHorizontal: 12,
    color: '#666',
  },
  dataTable: {
    backgroundColor: 'white',
    margin: 16,
  },
  tableColumn: {
    minWidth: 100,
  },
  filterModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  applyFilterButton: {
    marginTop: 24,
    backgroundColor: '#6C63FF',
  },
  datePickerModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  dateInput: {
    marginVertical: 16,
  },
  dateModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6C63FF',
  },
});

export default ReportsScreen;