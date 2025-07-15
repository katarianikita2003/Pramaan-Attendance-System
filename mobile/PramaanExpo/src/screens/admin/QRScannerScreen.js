// mobile/PramaanExpo/src/screens/admin/QRScannerScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../services/api';

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setVerifying(true);

    try {
      // Parse QR data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid QR code format');
      }

      // Verify with backend
      const response = await api.post('/attendance/verify-qr', {
        qrData: data // Send raw data for backend to parse
      });

      if (response.data.success) {
        setVerificationResult({
          success: true,
          scholar: response.data.data.scholar,
          attendance: response.data.data.attendance
        });
      } else {
        setVerificationResult({
          success: false,
          error: response.data.error
        });
      }
    } catch (error) {
      setVerificationResult({
        success: false,
        error: error.response?.data?.error || error.message || 'Verification failed'
      });
    } finally {
      setVerifying(false);
      setShowResultModal(true);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setVerificationResult(null);
    setShowResultModal(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="camera-off" size={64} color="#EF4444" />
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Attendance QR</Text>
      </View>

      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {verifying && (
          <View style={styles.verifyingOverlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.verifyingText}>Verifying attendance...</Text>
          </View>
        )}
      </View>

      <View style={styles.instructionContainer}>
        <MaterialIcons name="qr-code-scanner" size={32} color="#3B82F6" />
        <Text style={styles.instructionText}>
          Position the QR code within the frame
        </Text>
      </View>

      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={resetScanner}
      >
        <View style={styles.modalContainer}>
          <View style={[
            styles.modalContent,
            verificationResult?.success ? styles.successModal : styles.errorModal
          ]}>
            {verificationResult?.success ? (
              <>
                <View style={styles.successIcon}>
                  <MaterialIcons name="check-circle" size={80} color="#10B981" />
                </View>
                <Text style={styles.modalTitle}>Attendance Verified!</Text>
                
                <View style={styles.scholarInfo}>
                  <Text style={styles.infoLabel}>Scholar Details</Text>
                  <Text style={styles.infoText}>
                    Name: {verificationResult.scholar.name}
                  </Text>
                  <Text style={styles.infoText}>
                    ID: {verificationResult.scholar.scholarId}
                  </Text>
                  <Text style={styles.infoText}>
                    Department: {verificationResult.scholar.department}
                  </Text>
                </View>

                <View style={styles.attendanceInfo}>
                  <Text style={styles.infoLabel}>Attendance Details</Text>
                  <Text style={styles.infoText}>
                    Type: {verificationResult.attendance.type}
                  </Text>
                  <Text style={styles.infoText}>
                    Time: {new Date(verificationResult.attendance.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.errorIcon}>
                  <MaterialIcons name="error" size={80} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Verification Failed</Text>
                <Text style={styles.errorMessage}>
                  {verificationResult?.error || 'Unknown error occurred'}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.modalButton,
                verificationResult?.success ? styles.successButton : styles.errorButton
              ]}
              onPress={resetScanner}
            >
              <Text style={styles.modalButtonText}>
                {verificationResult?.success ? 'Scan Another' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10
  },
  backButton: {
    marginRight: 15
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  scannerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative'
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  verifyingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 10
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    elevation: 5
  },
  instructionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4B5563'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6B7280'
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center'
  },
  button: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center'
  },
  successModal: {
    borderWidth: 2,
    borderColor: '#10B981'
  },
  errorModal: {
    borderWidth: 2,
    borderColor: '#EF4444'
  },
  successIcon: {
    marginBottom: 20
  },
  errorIcon: {
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937'
  },
  scholarInfo: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },
  attendanceInfo: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 5
  },
  infoText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 3
  },
  errorMessage: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20
  },
  modalButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 10
  },
  successButton: {
    backgroundColor: '#10B981'
  },
  errorButton: {
    backgroundColor: '#EF4444'
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default QRScannerScreen;