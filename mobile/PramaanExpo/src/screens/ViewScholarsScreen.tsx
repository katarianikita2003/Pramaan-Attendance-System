import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Searchbar,
  List,
  Avatar,
  IconButton,
  FAB,
  Chip,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ViewScholarsScreen({ navigation }) {
  const [scholars, setScholars] = useState([]);
  const [filteredScholars, setFilteredScholars] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScholars();
  }, []);

  const loadScholars = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await api.get('/admin/scholars', { headers });
      setScholars(response.data.scholars);
      setFilteredScholars(response.data.scholars);
    } catch (error) {
      Alert.alert('Error', 'Failed to load scholars');
    } finally {
      setLoading(false);
    }
  };

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = scholars.filter(scholar =>
      scholar.name.toLowerCase().includes(query.toLowerCase()) ||
      scholar.scholarId.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredScholars(filtered);
  };

  const renderScholar = ({ item }) => (
    <Card style={styles.scholarCard}>
      <List.Item
        title={item.name}
        description={`ID: ${item.scholarId} | ${item.email}`}
        left={() => <Avatar.Text size={48} label={item.name.charAt(0)} />}
        right={() => (
          <View style={styles.rightContent}>
            <Chip mode="flat" compact>
              {item.attendancePercentage || 0}%
            </Chip>
            <IconButton
              icon="chevron-right"
              onPress={() => navigation.navigate('ScholarDetails', { scholar: item })}
            />
          </View>
        )}
      />
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Search scholars..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <FlatList
        data={filteredScholars}
        renderItem={renderScholar}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddScholar')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  scholarCard: {
    marginBottom: 8,
    elevation: 2,
  },
  rightContent: {
    flexDirection: 'row',
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