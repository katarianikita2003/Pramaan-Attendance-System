// mobile/PramaanExpo/src/screens/AttendanceScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { attendanceService, organizationService } from '../services/api';
import { APP_CONFIG } from '../config/constants';

const { width } = Dimensions.get('window');

const AttendanceScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [boundaries, setBoundaries] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [proofData, setProofData] = useState(null);

  useEffect(() => {
    checkPermissionsAndInit();
  }, []);

  const checkPermissionsAndInit = async () => {
    try {
      // Check location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to mark attendance.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Check biometric availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);

      // Get organization boundaries
      const boundariesResponse = await organizationService.getBoundaries();
      if (boundariesResponse.success) {
        setBoundaries(boundariesResponse.boundaries);
      }

      // Get current location
      await getCurrentLocation();
    } catch (error) {
      console.error('Init error:', error);
      Alert.alert('Error', 'Failed to initialize attendance marking');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationStatus('checking');
      
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy,
      });

      // Check if within boundaries
      if (boundaries) {
        const isWithin = checkIfWithinBoundaries(
          locationResult.coords.latitude,
          locationResult.coords.longitude
        );
        setLocationStatus(isWithin ? 'valid' : 'outside');
      } else {
        setLocationStatus('valid');
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('error');
    }
  };

  const checkIfWithinBoundaries = (lat, lon) => {
    if (!boundaries || !boundaries.center) return true;

    const distance = calculateDistance(
      lat,
      lon,
      boundaries.center.latitude,
      boundaries.center.longitude
    );

    return distance <= boundaries.radius;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleMarkAttendance = async () => {
    try {
      // Verify location
      if (locationStatus !== 'valid') {
        Alert.alert(
          'Invalid Location',
          'You must be within the campus/office boundaries to mark attendance.'
        );
        return;
      }

      // Biometric authentication
      if (biometricAvailable) {
        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to mark attendance',
          fallbackLabel: 'Use Password',
          cancelLabel: 'Cancel',
        });

        if (!authResult.success) {
          return;
        }
      }

      setLoading(true);

      // Mark attendance
      const response = await attendanceService.markAttendance({
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        },
        deviceInfo: {
          platform: Platform.OS,
          model: Platform.constants?.Model || 'Unknown',
        },
      });

      if (response.success) {
        setProofData(response.proof);
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
      Alert.alert(
        'Failed',
        error.response?.data?.error || 'Failed to mark attendance'
      );
    } finally {
      setLoading(false);
    }
  };

  const LocationCard = () => (
    <Card style={styles.locationCard}>
      <Card.Content>
        <View style={styles.locationHeader}>
          <Icon
            name="location-on"
            size={32}
            color={
              locationStatus === 'valid'
                ? '#4CAF50'
                : locationStatus === 'outside'
                ? '#FF5252'
                : '#FFC107'
            }
          />
          <View style={styles.locationInfo}>
            <Title style={styles.locationTitle}>
              {locationStatus === 'checking' && 'Checking Location...'}
              {locationStatus === 'valid' && 'Location Verified'}
              {locationStatus === 'outside' && 'Outside Campus'}
              {locationStatus === 'error' && 'Location Error'}
            </Title>
            {location && locationStatus === 'valid' && (
              <Paragraph style={styles.locationAccuracy}>
                Accuracy: ±{location.accuracy.toFixed(0)}m
              </Paragraph>
            )}
          </View>
        </View>

        {locationStatus === 'outside' && (
          <View style={styles.warningBox}>
            <Icon name="warning" size={20} color="#FF5252" />
            <Text style={styles.warningText}>
              You must be within campus boundaries to mark attendance
            </Text>
          </View>
        )}

        <Button
          mode="text"
          onPress={getCurrentLocation}
          style={styles.refreshButton}
          disabled={locationStatus === 'checking'}
        >
          Refresh Location
        </Button>
      </Card.Content>
    </Card>
  );

  const BiometricCard = () => (
    <Card style={styles.biometricCard}>
      <Card.Content>
        <View style={styles.biometricHeader}>
          <Icon
            name="fingerprint"
            size={48}
            color={biometricAvailable ? '#6C63FF' : '#BDBDBD'}
          />
          <View style={styles.biometricInfo}>
            <Title style={styles.biometricTitle}>
              {biometricAvailable
                ? 'Biometric Ready'
                : 'Biometric Not Available'}
            </Title>
            <Paragraph style={styles.biometricSubtitle}>
              {biometricAvailable
                ? 'Use your fingerprint or face to mark attendance'
                : 'Please set up biometric authentication in settings'}
            </Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <LocationCard />
        <BiometricCard />

        <View style={styles.illustration}>
          <Icon name="touch-app" size={80} color="#E0E0E0" />
          <Text style={styles.illustrationText}>
            Tap below to mark your attendance
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleMarkAttendance}
          style={styles.markButton}
          contentStyle={styles.markButtonContent}
          disabled={loading || locationStatus !== 'valid' || !biometricAvailable}
          loading={loading}
        >
          {loading ? 'Processing...' : 'Mark Attendance'}
        </Button>
      </View>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => {
            setShowSuccessDialog(false);
            navigation.goBack();
          }}
        >
          <Dialog.Content style={styles.dialogContent}>
            <Icon name="check-circle" size={64} color="#4CAF50" />
            <Title style={styles.dialogTitle}>Attendance Marked!</Title>
            <Paragraph style={styles.dialogText}>
              Your attendance has been successfully recorded
            </Paragraph>
            {proofData && (
              <View style={styles.proofContainer}>
                <Text style={styles.proofLabel}>Proof ID:</Text>
                <Text style={styles.proofId}>{proofData.proofId}</Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowSuccessDialog(false);
                navigation.navigate('AttendanceHistory');
              }}
            >
              View History
            </Button>
            <Button
              onPress={() => {
                setShowSuccessDialog(false);
                navigation.goBack();
              }}
            >
              Done
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  content: {
    flex: 1,
    padding: 16,
  },
  locationCard: {
    marginBottom: 16,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfo: {
    marginLeft: 16,
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
  },
  locationAccuracy: {
    fontSize: 14,
    color: '#666',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF5252',
    flex: 1,
  },
  refreshButton: {
    marginTop: 8,
  },
  biometricCard: {
    marginBottom: 16,
    elevation: 3,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricInfo: {
    marginLeft: 16,
    flex: 1,
  },
  biometricTitle: {
    fontSize: 18,
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  markButton: {
    backgroundColor: '#6C63FF',
    marginVertical: 16,
  },
  markButtonContent: {
    paddingVertical: 8,
  },
  dialogContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  dialogTitle: {
    marginTop: 16,
    fontSize: 24,
    textAlign: 'center',
  },
  dialogText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
  },
  proofContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '100%',
  },
  proofLabel: {
    fontSize: 12,
    color: '#666',
  },
  proofId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
});

export default AttendanceScreen;