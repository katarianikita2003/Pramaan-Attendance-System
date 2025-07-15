// // mobile/PramaanExpo/src/screens/AttendanceScreen.js
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Alert,
//   Image,
//   ActivityIndicator,
//   ScrollView,
//   Modal,
//   Platform
// } from 'react-native';
// import * as Location from 'expo-location';
// import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
// import { useAuth } from '../contexts/AuthContext';
// import { attendanceService } from '../services/api';

// const AttendanceScreen = ({ navigation }) => {
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const [qrCode, setQrCode] = useState(null);
//   const [proofDetails, setProofDetails] = useState(null);
//   const [showQRModal, setShowQRModal] = useState(false);
//   const [location, setLocation] = useState(null);
//   const [timeRemaining, setTimeRemaining] = useState(0);

//   useEffect(() => {
//     requestPermissions();
//   }, []);

//   useEffect(() => {
//     // Update countdown timer
//     if (proofDetails && proofDetails.expiresAt) {
//       const interval = setInterval(() => {
//         const remaining = Math.max(0, 
//           Math.floor((new Date(proofDetails.expiresAt) - new Date()) / 1000)
//         );
//         setTimeRemaining(remaining);
        
//         if (remaining === 0) {
//           setShowQRModal(false);
//           setQrCode(null);
//           setProofDetails(null);
//         }
//       }, 1000);

//       return () => clearInterval(interval);
//     }
//   }, [proofDetails]);

//   const requestPermissions = async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Permission Required', 'Location permission is required for attendance');
//       }
//     } catch (error) {
//       console.log('Location permission error:', error);
//     }
//   };

//   const getCurrentLocation = async () => {
//     try {
//       const location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.High
//       });
//       return {
//         coordinates: {
//           latitude: location.coords.latitude,
//           longitude: location.coords.longitude
//         },
//         accuracy: location.coords.accuracy
//       };
//     } catch (error) {
//       // Return mock location for testing
//       console.log('Using mock location for testing');
//       return {
//         coordinates: {
//           latitude: 28.6139,
//           longitude: 77.2090
//         },
//         accuracy: 10
//       };
//     }
//   };

//   const generateAttendanceProof = async () => {
//     try {
//       setLoading(true);

//       // Step 1: Get location
//       const currentLocation = await getCurrentLocation();
//       setLocation(currentLocation);

//       // Step 2: Generate mock biometric data for testing
//       const biometricData = {
//         type: 'fingerprint',
//         data: `bio_${Date.now()}_${Math.random().toString(36)}`,
//         quality: 0.95,
//         timestamp: Date.now()
//       };

//       // Step 3: Generate proof and QR code using the new endpoint
//       const response = await attendanceService.generateProof(
//         biometricData,
//         currentLocation
//       );

//       if (response.success) {
//         setQrCode(response.data.qrCode);
//         setProofDetails({
//           proofId: response.data.proofId,
//           expiresAt: response.data.expiresAt,
//           attendanceId: response.data.attendanceId
//         });
//         setShowQRModal(true);
//         Alert.alert('Success', 'QR code generated! Show this to your admin for verification.');
//       }
//     } catch (error) {
//       console.error('Generate proof error:', error);
//       Alert.alert(
//         'Error',
//         error.response?.data?.error || error.message || 'Failed to generate attendance proof'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Mark Attendance</Text>
//         <Text style={styles.headerSubtitle}>
//           Generate your attendance proof
//         </Text>
//       </View>

//       <View style={styles.infoCard}>
//         <MaterialIcons name="info" size={24} color="#3B82F6" />
//         <Text style={styles.infoText}>
//           1. Click the button below{'\n'}
//           2. Generate QR code proof{'\n'}
//           3. Show QR code to admin for verification
//         </Text>
//       </View>

//       <TouchableOpacity
//         style={[styles.generateButton, loading && styles.buttonDisabled]}
//         onPress={generateAttendanceProof}
//         disabled={loading}
//       >
//         {loading ? (
//           <ActivityIndicator color="white" />
//         ) : (
//           <>
//             <FontAwesome5 name="qrcode" size={24} color="white" />
//             <Text style={styles.buttonText}>Generate Attendance QR</Text>
//           </>
//         )}
//       </TouchableOpacity>

//       {location && (
//         <View style={styles.locationInfo}>
//           <MaterialIcons name="location-on" size={20} color="#10B981" />
//           <Text style={styles.locationText}>
//             Location captured (±{Math.round(location.accuracy)}m)
//           </Text>
//         </View>
//       )}

//       <Modal
//         visible={showQRModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowQRModal(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Attendance QR Code</Text>
            
//             {qrCode && (
//               <View style={styles.qrContainer}>
//                 <Image
//                   source={{ uri: qrCode }}
//                   style={styles.qrCode}
//                   resizeMode="contain"
//                 />
//               </View>
//             )}

//             <View style={styles.timerContainer}>
//               <MaterialIcons name="timer" size={20} color="#EF4444" />
//               <Text style={styles.timerText}>
//                 Expires in: {formatTime(timeRemaining)}
//               </Text>
//             </View>

//             <Text style={styles.proofId}>
//               Proof ID: {proofDetails?.proofId?.substring(0, 8)}...
//             </Text>

//             <TouchableOpacity
//               style={styles.closeButton}
//               onPress={() => setShowQRModal(false)}
//             >
//               <Text style={styles.closeButtonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F3F4F6'
//   },
//   header: {
//     backgroundColor: '#3B82F6',
//     padding: 20,
//     paddingTop: 40,
//     borderBottomLeftRadius: 20,
//     borderBottomRightRadius: 20
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 5
//   },
//   headerSubtitle: {
//     fontSize: 16,
//     color: '#E0E7FF'
//   },
//   infoCard: {
//     backgroundColor: '#EBF8FF',
//     margin: 20,
//     padding: 15,
//     borderRadius: 10,
//     flexDirection: 'row',
//     alignItems: 'flex-start'
//   },
//   infoText: {
//     marginLeft: 10,
//     flex: 1,
//     color: '#1E40AF',
//     lineHeight: 22
//   },
//   generateButton: {
//     backgroundColor: '#10B981',
//     margin: 20,
//     padding: 20,
//     borderRadius: 15,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4
//   },
//   buttonDisabled: {
//     backgroundColor: '#9CA3AF'
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: '600',
//     marginLeft: 10
//   },
//   locationInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 10
//   },
//   locationText: {
//     marginLeft: 5,
//     color: '#10B981'
//   },
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
//   modalContent: {
//     backgroundColor: 'white',
//     borderRadius: 20,
//     padding: 20,
//     width: '90%',
//     maxWidth: 400,
//     alignItems: 'center'
//   },
//   modalTitle: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#1F2937'
//   },
//   qrContainer: {
//     backgroundColor: 'white',
//     padding: 10,
//     borderRadius: 10,
//     elevation: 2
//   },
//   qrCode: {
//     width: 250,
//     height: 250
//   },
//   timerContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 20,
//     backgroundColor: '#FEE2E2',
//     padding: 10,
//     borderRadius: 10
//   },
//   timerText: {
//     marginLeft: 5,
//     color: '#EF4444',
//     fontWeight: '600'
//   },
//   proofId: {
//     marginTop: 10,
//     color: '#6B7280',
//     fontSize: 12
//   },
//   closeButton: {
//     marginTop: 20,
//     backgroundColor: '#3B82F6',
//     paddingHorizontal: 30,
//     paddingVertical: 12,
//     borderRadius: 10
//   },
//   closeButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600'
//   }
// });

// export default AttendanceScreen;