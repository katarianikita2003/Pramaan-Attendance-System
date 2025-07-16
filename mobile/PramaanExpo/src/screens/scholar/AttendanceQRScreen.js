// mobile/PramaanExpo/src/screens/scholar/AttendanceQRScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Text,
  IconButton,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';

const AttendanceQRScreen = ({ route, navigation }) => {
  const { qrData, attendanceType, expiresAt } = route.params;
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        Alert.alert('QR Expired', 'The QR code has expired. Please generate a new one.');
        navigation.goBack();
      }
    }, 1000);

    // Prevent going back while QR is active
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Cancel Attendance?',
        'Are you sure you want to cancel marking attendance?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => navigation.goBack() }
        ]
      );
      return true;
    });

    return () => {
      clearInterval(timer);
      backHandler.remove();
    };
  }, [expiresAt, navigation]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title 
          title={`${attendanceType === 'checkIn' ? 'Check-In' : 'Check-Out'} QR Code`}
          subtitle="Show this to admin to mark attendance"
        />
        <Card.Content>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={250}
              backgroundColor="white"
              color="black"
            />
          </View>
          
          <Surface style={styles.timerSurface}>
            <Text style={styles.timerLabel}>Expires in:</Text>
            <Text style={[
              styles.timerText,
              timeRemaining < 60 && styles.timerTextWarning
            ]}>
              {formatTime(timeRemaining)}
            </Text>
          </Surface>

          <Paragraph style={styles.instructions}>
            Please show this QR code to the admin to complete your {attendanceType}.
            The QR code will expire in 5 minutes for security reasons.
          </Paragraph>
        </Card.Content>
        
        <Card.Actions>
          <Button onPress={() => navigation.goBack()}>Cancel</Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginTop: 16,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 16,
  },
  timerSurface: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  timerLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  timerTextWarning: {
    color: '#FF5252',
  },
  instructions: {
    textAlign: 'center',
    marginTop: 16,
    color: '#666',
  },
});

export default AttendanceQRScreen;