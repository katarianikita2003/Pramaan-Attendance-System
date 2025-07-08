import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Button,
  Title,
  List,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';

const MarkAttendanceScreen = ({ navigation }: any) => {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [attendanceSteps, setAttendanceSteps] = useState({
    location: false,
    biometric: false,
    zkProof: false,
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      // For real implementation, use react-native-permissions
      getCurrentLocation();
    } catch (error) {
      Alert.alert('Error', 'Location permission is required');
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    // Simulate getting location
    setTimeout(() => {
      setLocation({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 15,
      });
      setAttendanceSteps(prev => ({ ...prev, location: true }));
      setLoading(false);
    }, 2000);
  };

  const handleBiometricScan = () => {
    Alert.alert(
      'Biometric Authentication',
      'Place your finger on the sensor',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            setLoading(true);
            // Simulate biometric scan
            setTimeout(() => {
              setAttendanceSteps(prev => ({ ...prev, biometric: true }));
              setBiometricReady(true);
              setLoading(false);
              Alert.alert('Success', 'Biometric scan successful');
            }, 3000);
          },
        },
      ]
    );
  };

  const generateZKProof = async () => {
    setLoading(true);
    try {
      // Simulate ZKP generation
      setTimeout(() => {
        setAttendanceSteps(prev => ({ ...prev, zkProof: true }));
        setLoading(false);
        submitAttendance();
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to generate proof');
    }
  };

  const submitAttendance = () => {
    Alert.alert(
      'Success',
      'Attendance marked successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const allStepsCompleted = Object.values(attendanceSteps).every(v => v);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Mark Your Attendance</Title>
            <Text style={styles.subtitle}>
              Complete all steps to mark your attendance
            </Text>

            {/* Location Step */}
            <List.Item
              title="Location Verification"
              description={location ? `Accuracy: ${location.accuracy}m` : 'Getting your location...'}
              left={props => (
                <List.Icon
                  {...props}
                  icon="map-marker"
                  color={attendanceSteps.location ? '#4CAF50' : '#999'}
                />
              )}
              right={() => (
                attendanceSteps.location ? (
                  <Chip icon="check" style={styles.successChip}>Done</Chip>
                ) : (
                  loading && <ActivityIndicator size="small" />
                )
              )}
            />

            {/* Biometric Step */}
            <List.Item
              title="Biometric Authentication"
              description="Scan your fingerprint or face"
              left={props => (
                <List.Icon
                  {...props}
                  icon="fingerprint"
                  color={attendanceSteps.biometric ? '#4CAF50' : '#999'}
                />
              )}
              right={() => (
                attendanceSteps.biometric ? (
                  <Chip icon="check" style={styles.successChip}>Done</Chip>
                ) : (
                  <Button
                    mode="outlined"
                    onPress={handleBiometricScan}
                    disabled={!attendanceSteps.location || loading}
                    compact
                  >
                    Scan
                  </Button>
                )
              )}
            />

            {/* ZK Proof Step */}
            <List.Item
              title="Generate ZK Proof"
              description="Creating privacy-preserving proof"
              left={props => (
                <List.Icon
                  {...props}
                  icon="shield-check"
                  color={attendanceSteps.zkProof ? '#4CAF50' : '#999'}
                />
              )}
              right={() => (
                attendanceSteps.zkProof ? (
                  <Chip icon="check" style={styles.successChip}>Done</Chip>
                ) : (
                  loading && attendanceSteps.biometric && <ActivityIndicator size="small" />
                )
              )}
            />
          </Card.Content>
        </Card>

        {/* Action Button */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={generateZKProof}
              style={styles.submitButton}
              contentStyle={styles.buttonContent}
              disabled={!biometricReady || loading || allStepsCompleted}
              loading={loading}
            >
              {allStepsCompleted ? 'Attendance Marked' : 'Submit Attendance'}
            </Button>
          </Card.Content>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Your biometric data is never stored. Only a zero-knowledge proof
                is generated and submitted.
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successChip: {
    backgroundColor: '#E8F5E9',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
  },
  buttonContent: {
    height: 50,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
  },
});

export default MarkAttendanceScreen;