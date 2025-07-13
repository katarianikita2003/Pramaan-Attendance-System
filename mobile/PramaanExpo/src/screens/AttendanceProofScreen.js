// src/screens/AttendanceProofScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AttendanceProofScreen = ({ route }) => {
  const { attendance } = route.params || {};

  const shareProof = async () => {
    try {
      const message = `Pramaan Attendance Proof\nProof ID: ${attendance.proofId}\nDate: ${new Date(attendance.markedAt).toLocaleDateString()}\nTime: ${new Date(attendance.markedAt).toLocaleTimeString()}\nStatus: Verified`;
      
      await Share.share({
        message,
        title: 'Attendance Proof',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share proof');
    }
  };

  if (!attendance) {
    return (
      <View style={styles.container}>
        <Text>No attendance data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={60} color="#4CAF50" />
        <Text style={styles.title}>Attendance Verified</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Proof Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Proof ID:</Text>
          <Text style={styles.value}>{attendance.proofId}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {new Date(attendance.markedAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>
            {new Date(attendance.markedAt).toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.successText]}>Verified</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Method:</Text>
          <Text style={styles.value}>
            {attendance.verificationMethod === 'zkp' ? 'Zero Knowledge Proof' : 'Biometric (Simulated)'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={shareProof}>
        <Ionicons name="share-outline" size={24} color="#FFF" />
        <Text style={styles.shareButtonText}>Share Proof</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  detailsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  successText: {
    color: '#4CAF50',
  },
  shareButton: {
    backgroundColor: '#6200EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default AttendanceProofScreen;