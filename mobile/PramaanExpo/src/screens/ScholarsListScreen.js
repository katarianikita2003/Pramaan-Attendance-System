import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Card, Searchbar, FAB, Chip, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
export default function ScholarsListScreen({ navigation }) {
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  useEffect(() => {
    fetchScholars();
  }, []);
  const fetchScholars = async () => {
    try {
      const response = await api.get('/scholars');
      setScholars(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch scholars');
    }
    setLoading(false);
  };
  const deleteScholar = async (scholarId) => {
    Alert.alert(
      'Delete Scholar',
      'Are you sure you want to delete this scholar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/scholars/${scholarId}`);
              Alert.alert('Success', 'Scholar deleted successfully');
              fetchScholars();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete scholar');
            }
          },
        },
      ]
    );
  };
  const filteredScholars = scholars.filter(scholar => {
    const matchesSearch = scholar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scholar.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || scholar.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });
  const renderScholarItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ScholarProfile', { scholarId: item.id })}
    >
      <Card style={styles.scholarCard}>
        <Card.Content>
          <View style={styles.scholarHeader}>
            <Avatar.Text
              size={48}
              label={item.name.split(' ').map(n => n[0]).join('')}
              style={styles.avatar}
            />
            <View style={styles.scholarInfo}>
              <Text style={styles.scholarName}>{item.name}</Text>
              <Text style={styles.scholarId}>{item.id}</Text>
              <View style={styles.chipContainer}>
                <Chip style={styles.departmentChip}>{item.department}</Chip>
                <Chip
                  style={[
                    styles.statusChip,
                    item.isActive ? styles.activeChip : styles.inactiveChip,
                  ]}
                >
                  {item.isActive ? 'Active' : 'Inactive'}
                </Chip>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => deleteScholar(item.id)}
              style={styles.deleteButton}
            >
              <Icon name="delete" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
  const departments = ['all', 'Computer Science', 'Engineering', 'Mathematics', 'Physics'];
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search scholars..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {departments.map(dept => (
            <TouchableOpacity
              key={dept}
              onPress={() => setSelectedDepartment(dept)}
            >
              <Chip
                style={[
                  styles.filterChip,
                  selectedDepartment === dept && styles.selectedFilterChip,
                ]}
              >
                {dept === 'all' ? 'All Departments' : dept}
              </Chip>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredScholars}
          renderItem={renderScholarItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-off" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>No scholars found</Text>
            </View>
          }
        />
      )}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddScholar')}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  searchBar: {
    margin: 16,
    elevation: 0,
    backgroundColor: '#FFFFFF',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  selectedFilterChip: {
    backgroundColor: '#1E3A8A',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  scholarCard: {
    marginBottom: 12,
    elevation: 2,
  },
  scholarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#1E3A8A',
  },
  scholarInfo: {
    flex: 1,
    marginLeft: 16,
  },
  scholarName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  scholarId: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  departmentChip: {
    height: 24,
    marginRight: 8,
    backgroundColor: '#E0E7FF',
  },
  statusChip: {
    height: 24,
  },
  activeChip: {
    backgroundColor: '#D1FAE5',
  },
  inactiveChip: {
    backgroundColor: '#FEE2E2',
  },
  deleteButton: {
    padding: 8,
  },
  loader: {
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E3A8A',
  },
});
