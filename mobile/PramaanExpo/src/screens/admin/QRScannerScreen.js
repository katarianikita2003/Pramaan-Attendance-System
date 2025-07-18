// mobile/PramaanExpo/src/screens/admin/QRScannerScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Vibration
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Card, Title, Button, Surface } from 'react-native-paper';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import api from '../../services/api';

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setScannerActive(false);
    Vibration.vibrate(100);

    try {
      setVerifying(true);
      
      // Decode QR data
      let qrData;
      try {
        const decoded = Buffer.from(data, 'base64').toString('utf-8');
        qrData = JSON.parse(decoded);
      } catch (e) {
        throw new Error('Invalid QR code format');
      }

      // Check expiry locally first
      if (qrData.e && qrData.e < Math.floor(Date.now() / 1000)) {
        throw new Error('QR code has expired');
      }

      // Send to backend for verification
      const response = await api.post('/attendance/verify-qr', {
        qrData: data,
        scanTimestamp: Date.now(),
        scannerDeviceId: DeviceInfo.getUniqueId()
      });

      if (response.data.success) {
        setVerificationResult({
          success: true,
          scholar: response.data.scholar,
          attendanceType: response.data.attendanceType,
          verificationKey: response.data.verificationKey
        });

        Alert.alert(
          'Attendance Verified',
          `${response.data.scholar.name} - ${response.data.attendanceType === 'checkIn' ? 'Check-in' : 'Check-out'} verified successfully`,
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                setScannerActive(true);
                setVerificationResult(null);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('QR verification error:', error);
      
      Alert.alert(
        'Verification Failed',
        error.response?.data?.error || error.message || 'Invalid or expired QR code',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setScannerActive(true);
            }
          }
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Icon name="camera-off" size={80} color="#666" />
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Attendance QR</Text>
        <View style={{ width: 24 }} />
      </View>

      {scannerActive ? (
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          barCodeScannerSettings={{
            barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
          }}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scannerText}>
              Position QR code within the frame
            </Text>
          </View>
        </Camera>
      ) : (
        <View style={styles.resultContainer}>
          {verifying ? (
            <>
              <ActivityIndicator size="large" color="#6200ea" />
              <Text style={styles.verifyingText}>Verifying attendance...</Text>
            </>
          ) : verificationResult ? (
            <Card style={styles.resultCard}>
              <Card.Content>
                <Icon 
                  name="check-circle" 
                  size={60} 
                  color="#4caf50" 
                  style={styles.successIcon}
                />
                <Title style={styles.successTitle}>Attendance Verified</Title>
                <View style={styles.resultDetails}>
                  <Text style={styles.detailLabel}>Scholar:</Text>
                  <Text style={styles.detailValue}>
                    {verificationResult.scholar.name}
                  </Text>
                </View>
                <View style={styles.resultDetails}>
                  <Text style={styles.detailLabel}>ID:</Text>
                  <Text style={styles.detailValue}>
                    {verificationResult.scholar.scholarId}
                  </Text>
                </View>
                <View style={styles.resultDetails}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {verificationResult.attendanceType === 'checkIn' ? 'Check-In' : 'Check-Out'}
                  </Text>
                </View>
                <View style={styles.resultDetails}>
                  <Text style={styles.detailLabel}>Verification Key:</Text>
                  <Text style={styles.detailValue}>
                    {verificationResult.verificationKey.substring(0, 8)}...
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ) : null}
        </View>
      )}

      {!scannerActive && !verifying && (
        <Button
          mode="contained"
          onPress={() => {
            setScanned(false);
            setScannerActive(true);
            setVerificationResult(null);
          }}
          style={styles.scanAgainButton}
        >
          Scan Another QR
        </Button>
      )}
    </View>
  );
};

// backend/src/controllers/attendance.controller.enhanced.js - Updated verify method
export const verifyQRAttendance = async (req, res) => {
  try {
    const { qrData, scanTimestamp, scannerDeviceId } = req.body;
    const adminOrgId = req.user.organizationId;
    const adminId = req.user.userId;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
    }

    // Decode QR data
    let decodedData;
    try {
      const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
      decodedData = JSON.parse(decoded);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code format'
      });
    }

    // Verify QR hasn't expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedData.e && decodedData.e < currentTime) {
      return res.status(400).json({
        success: false,
        error: 'QR code has expired',
        code: 'QR_EXPIRED'
      });
    }

    // Find the attendance record by proof ID prefix
    const attendance = await Attendance.findOne({
      'proofData.zkProof.proofId': { 
        $regex: `^${decodedData.p}`,
        $options: 'i'
      },
      status: 'pending' // Only pending attendance can be verified
    }).populate('scholarId', 'scholarId personalInfo.name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or already verified QR code'
      });
    }

    // Verify organization matches
    if (attendance.organizationId.toString() !== adminOrgId) {
      return res.status(403).json({
        success: false,
        error: 'This QR code belongs to a different organization'
      });
    }

    // Verify the ZKP proof
    const isValidProof = await enhancedZKPService.verifyAttendanceProof(
      attendance.proofData.zkProof
    );

    if (!isValidProof) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attendance proof'
      });
    }

    // Generate admin verification key
    const verificationKey = crypto.randomBytes(16).toString('hex');
    const verificationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update attendance with verification
    attendance.status = 'present';
    attendance.verificationData = {
      verifiedBy: adminId,
      verificationKey,
      verificationExpiry,
      scannerDeviceId,
      verifiedAt: new Date(),
      scanTimestamp
    };

    // Update check-in/out times based on type
    if (attendance.attendanceType === 'checkIn') {
      attendance.checkIn = {
        time: attendance.date,
        verifiedAt: new Date()
      };
    } else {
      attendance.checkOut = {
        time: attendance.date,
        verifiedAt: new Date()
      };
    }

    await attendance.save();

    // Create verification log
    await AttendanceVerificationLog.create({
      attendanceId: attendance._id,
      scholarId: attendance.scholarId._id,
      adminId,
      organizationId: adminOrgId,
      verificationKey,
      qrData: decodedData,
      scannerDeviceId,
      verifiedAt: new Date()
    });

    logger.info(`Attendance verified for scholar ${attendance.scholarId.scholarId} by admin ${adminId}`);

    res.json({
      success: true,
      message: 'Attendance verified successfully',
      scholar: {
        id: attendance.scholarId._id,
        scholarId: attendance.scholarId.scholarId,
        name: attendance.scholarId.personalInfo.name
      },
      attendanceType: attendance.attendanceType,
      verificationKey,
      verificationExpiry,
      attendance: {
        id: attendance._id,
        date: attendance.date,
        type: attendance.attendanceType
      }
    });

  } catch (error) {
    logger.error('QR verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify QR code',
      details: error.message
    });
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6200ea',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  verifyingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  resultCard: {
    width: '100%',
    elevation: 4,
  },
  successIcon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  successTitle: {
    textAlign: 'center',
    fontSize: 22,
    marginBottom: 20,
    color: '#4caf50',
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanAgainButton: {
    margin: 20,
    backgroundColor: '#6200ea',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
  },
});

export default QRScannerScreen;