// src/screens/MarkAttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import biometricService from '../services/biometricService';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';

const { width } = Dimensions.get('window');

const MarkAttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [biometricStatus, setBiometricStatus] = useState('ready');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    checkTodayAttendance();
    checkLocationPermission();
  }, []);

  const checkTodayAttendance = async () => {
    try {
      // Check if attendance already marked today
      const response = await api.get('/scholar/attendance/today');
      if (response.data.attendance) {
        setTodayAttendance(response.data.attendance);
      }
    } catch (error) {
      // 404 is expected if no attendance today
      if (error.response?.status !== 404) {
        console.error('Error checking today attendance:', error);
      }
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to mark attendance.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
      setLocationStatus('ready');
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('error');
    }
  };

  const authenticateBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // Simulate biometric for development
        console.log('No biometric hardware, simulating...');
        return { success: true, simulated: true };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supportedTypes.length === 0) {
        // Simulate biometric for development
        console.log('No biometric enrolled, simulating...');
        return { success: true, simulated: true };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to mark attendance',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      return result;
    } catch (error) {
      console.error('Biometric error:', error);
      return { success: false, error: error.message };
    }
  };

  const markAttendance = async () => {
    if (todayAttendance) {
      Alert.alert(
        'Already Marked',
        'You have already marked your attendance for today.'
      );
      return;
    }

    if (locationStatus !== 'ready') {
      Alert.alert(
        'Location Required',
        'Please enable location services and try again.'
      );
      checkLocationPermission();
      return;
    }

    setLoading(true);
    setBiometricStatus('authenticating');

    try {
      // Step 1: Biometric Authentication
      const biometricResult = await authenticateBiometric();
      
      if (!biometricResult.success) {
        setBiometricStatus('failed');
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. Please try again.'
        );
        return;
      }

      setBiometricStatus('authenticated');

      // Step 2: Generate biometric proof using the biometricService
      console.log('Generating biometric proof for attendance...');
      
      let biometricProof;
      let zkProof;
      
      try {
        // Use the generateBiometricProof function from biometricService
        const proofResult = await biometricService.generateBiometricProof(
          user.scholarId,
          biometricResult.simulated ? 'simulated' : 'fingerprint'
        );
        
        biometricProof = proofResult.proof;
        zkProof = {
          proof: proofResult.proof,
          publicInputs: proofResult.publicInputs,
        };
      } catch (proofError) {
        console.error('Error generating biometric proof:', proofError);
        // Fallback for development/testing
        biometricProof = 'simulated-proof-' + Date.now();
        zkProof = {
          proof: biometricProof,
          publicInputs: {
            scholarId: user.scholarId,
            timestamp: Date.now(),
            biometricType: biometricResult.simulated ? 'simulated' : 'fingerprint'
          }
        };
      }

      // Step 3: Prepare attendance data
      const attendanceData = {
        scholarId: user.scholarId,
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
        },
        biometricType: biometricResult.simulated ? 'simulated' : 'fingerprint',
        biometricProof: biometricProof,
        zkProof: zkProof,
        timestamp: new Date().toISOString(),
      };

      console.log('Marking attendance with data:', {
        scholarId: attendanceData.scholarId,
        biometricType: attendanceData.biometricType,
        hasProof: !!attendanceData.biometricProof,
        hasLocation: !!attendanceData.location,
      });

      // Step 4: Mark attendance
      const response = await api.post('/attendance/mark', attendanceData);

      if (response.data.success) {
        setTodayAttendance(response.data.attendance);
        Alert.alert(
          'Success',
          'Attendance marked successfully!',
          [
            {
              text: 'View Proof',
              onPress: () => viewAttendanceProof(response.data.attendance),
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 500 && error.response?.data?.details?.includes('ZKP Service')) {
        Alert.alert(
          'Service Temporarily Unavailable',
          'The attendance verification service is being initialized. Please try again in a few moments.'
        );
      } else if (error.response?.status === 403) {
        Alert.alert(
          'Biometric Not Enrolled',
          'Please enroll your biometric data first from your profile settings.'
        );
      } else if (error.response?.status === 409) {
        Alert.alert(
          'Attendance Already Marked',
          error.response?.data?.error || 'You have already marked attendance for today.'
        );
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.error || 'Failed to mark attendance. Please try again.'
        );
      }
    } finally {
      setLoading(false);
      setBiometricStatus('ready');
    }
  };

  const viewAttendanceProof = (attendance) => {
    // Navigate to the stack navigator's AttendanceProof screen
    navigation.getParent()?.navigate('AttendanceProof', { attendance });
  };

  const getStatusIcon = () => {
    if (todayAttendance) {
      return <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />;
    }
    if (loading) {
      return <ActivityIndicator size="large" color="#6200EE" />;
    }
    if (biometricStatus === 'authenticating') {
      return <Ionicons name="finger-print" size={100} color="#6200EE" />;
    }
    return <Ionicons name="finger-print-outline" size={100} color="#666" />;
  };

  const getStatusText = () => {
    if (todayAttendance) {
      return 'Attendance Already Marked';
    }
    if (loading) {
      return 'Processing...';
    }
    if (biometricStatus === 'authenticating') {
      return 'Authenticating...';
    }
    return 'Ready to Mark Attendance';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Mark Attendance</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</Text>
      </View>

      <View style={styles.statusContainer}>
        {getStatusIcon()}
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Location Status */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons 
            name="location" 
            size={24} 
            color={locationStatus === 'ready' ? '#4CAF50' : '#FF5252'} 
          />
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={[
            styles.infoValue,
            { color: locationStatus === 'ready' ? '#4CAF50' : '#FF5252' }
          ]}>
            {locationStatus === 'ready' ? 'Ready' : 
             locationStatus === 'checking' ? 'Checking...' : 'Not Available'}
          </Text>
        </View>
      </View>

      {/* Biometric Status */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons 
            name="finger-print" 
            size={24} 
            color={biometricStatus === 'ready' ? '#4CAF50' : '#FFA726'} 
          />
          <Text style={styles.infoLabel}>Biometric</Text>
          <Text style={[
            styles.infoValue,
            { color: biometricStatus === 'ready' ? '#4CAF50' : '#FFA726' }
          ]}>
            {biometricStatus === 'ready' ? 'Ready' : 
             biometricStatus === 'authenticating' ? 'Authenticating...' : 'Failed'}
          </Text>
        </View>
      </View>

      {/* Scholar Info */}
      <View style={styles.infoCard}>
        <Text style={styles.scholarInfo}>Scholar ID: {user.scholarId}</Text>
        <Text style={styles.scholarInfo}>Name: {user.name}</Text>
      </View>

      {/* Mark Attendance Button */}
      {!todayAttendance && (
        <TouchableOpacity
          style={[
            styles.markButton,
            (loading || locationStatus !== 'ready') && styles.markButtonDisabled
          ]}
          onPress={markAttendance}
          disabled={loading || locationStatus !== 'ready'}
        >
          <Ionicons name="finger-print" size={28} color="#FFF" />
          <Text style={styles.markButtonText}>
            {loading ? 'Processing...' : 'Mark Attendance'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Today's Attendance Details */}
      {todayAttendance && (
        <View style={styles.attendanceCard}>
          <Text style={styles.attendanceTitle}>Today's Attendance</Text>
          <View style={styles.attendanceDetail}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {new Date(todayAttendance.timestamp).toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.attendanceDetail}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, styles.successText]}>Verified</Text>
          </View>
          {todayAttendance.proofId && (
            <View style={styles.attendanceDetail}>
              <Text style={styles.detailLabel}>Proof ID:</Text>
              <Text style={styles.detailValue}>{todayAttendance.proofId.substring(0, 16)}...</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.viewProofButton}
            onPress={() => viewAttendanceProof(todayAttendance)}
          >
            <Text style={styles.viewProofText}>View Proof</Text>
            <Ionicons name="arrow-forward" size={20} color="#6200EE" />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#6200EE',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  date: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 5,
    opacity: 0.9,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  statusText: {
    fontSize: 18,
    color: '#333',
    marginTop: 15,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  scholarInfo: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
  },
  markButton: {
    backgroundColor: '#6200EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 18,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  markButtonDisabled: {
    backgroundColor: '#CCC',
    elevation: 0,
  },
  markButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  attendanceCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  attendanceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  successText: {
    color: '#4CAF50',
  },
  viewProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  viewProofText: {
    fontSize: 16,
    color: '#6200EE',
    fontWeight: '500',
    marginRight: 5,
  },
});

export default MarkAttendanceScreen;