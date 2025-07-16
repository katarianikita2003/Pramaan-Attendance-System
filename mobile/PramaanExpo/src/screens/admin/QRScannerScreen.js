// mobile/PramaanExpo/src/screens/admin/QRScannerScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import api from '../../services/api';

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    
    try {
      const response = await api.post('/attendance/verify-qr', {
        qrData: data
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          `${response.data.scholar.name} - ${response.data.attendanceType} marked successfully`,
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Invalid or expired QR code',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
};