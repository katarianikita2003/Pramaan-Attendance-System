// mobile/PramaanExpo/src/screens/AddScholarScreen.js
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  ActivityIndicator,
  useTheme,
  Appbar,
  ProgressBar,
  RadioButton,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import biometricService from '../services/biometricService';

const AddScholarScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Scholar data
  const [scholarData, setScholarData] = useState({
    scholarId: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    department: '',
    course: '',
    year: '',
    section: '',
    rollNumber: '',
    guardianName: '',
    guardianPhone: '',
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [biometricType, setBiometricType] = useState('face');
  const [biometricData, setBiometricData] = useState({
    faceImage: null,
    faceCommitment: null,
    fingerprintData: null,
    fingerprintCommitment: null,
  });

  const validateStep1 = () => {
    if (!scholarData.scholarId || !scholarData.name || !scholarData.email || !scholarData.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(scholarData.email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!scholarData.department || !scholarData.course || !scholarData.year) {
      Alert.alert('Error', 'Please fill all academic details');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const captureProfilePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images', // FIXED: Using string directly
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setProfilePhoto(imageUri);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const captureFace = async () => {
    try {
      setLoading(true);

      // Request camera permission first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to capture face');
        setLoading(false);
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images', // FIXED: Using string directly
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setBiometricData({
          ...biometricData,
          faceImage: asset.uri,
        });

        // Generate commitment
        const commitmentData = await biometricService.generateBiometricCommitment({
          uri: asset.uri,
          base64: asset.base64,
        });

        setBiometricData(prev => ({
          ...prev,
          faceCommitment: commitmentData,
        }));

        Alert.alert('Success', 'Face captured successfully');
      }
    } catch (error) {
      console.error('Face capture error:', error);
      Alert.alert('Error', 'Failed to capture face photo');
    } finally {
      setLoading(false);
    }
  };

  const captureFingerprint = async () => {
    try {
      setLoading(true);
      const result = await biometricService.captureFingerprint();

      if (result.success) {
        setBiometricData({
          ...biometricData,
          fingerprintData: result.data,
          fingerprintCommitment: result.commitment,
        });
        Alert.alert('Success', 'Fingerprint captured successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to capture fingerprint');
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      Alert.alert('Error', 'Failed to capture fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Prepare scholar data
      const requestData = {
        scholarId: scholarData.scholarId,
        personalInfo: {
          name: scholarData.name,
          email: scholarData.email,
          phone: scholarData.phone,
          profilePhoto: profilePhoto,
        },
        academicInfo: {
          department: scholarData.department,
          course: scholarData.course,
          year: scholarData.year,
          section: scholarData.section,
          rollNumber: scholarData.rollNumber,
        },
        guardianInfo: {
          name: scholarData.guardianName,
          phone: scholarData.guardianPhone,
        },
        password: scholarData.password,
        organizationId: user.organizationId,
        biometricData: {
          faceCommitment: biometricData.faceCommitment,
          fingerprintCommitment: biometricData.fingerprintCommitment,
        },
      };

      console.log('Submitting scholar data with organizationId:', user.organizationId);
      console.log('Biometrics data:', requestData.biometricData);

      const response = await api.post('/admin/scholars', requestData);

      if (response.data.success) {
        Alert.alert('Success', 'Scholar registered successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to register scholar');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.stepTitle}>Personal Information</Text>
        <Text variant="bodySmall" style={styles.stepSubtitle}>Step 1 of 3</Text>

        <TextInput
          label="Scholar ID *"
          value={scholarData.scholarId}
          onChangeText={(text) => setScholarData({ ...scholarData, scholarId: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Full Name *"
          value={scholarData.name}
          onChangeText={(text) => setScholarData({ ...scholarData, name: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Email *"
          value={scholarData.email}
          onChangeText={(text) => setScholarData({ ...scholarData, email: text })}
          style={styles.input}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Phone"
          value={scholarData.phone}
          onChangeText={(text) => setScholarData({ ...scholarData, phone: text })}
          style={styles.input}
          mode="outlined"
          keyboardType="phone-pad"
        />

        <TextInput
          label="Password *"
          value={scholarData.password}
          onChangeText={(text) => setScholarData({ ...scholarData, password: text })}
          style={styles.input}
          mode="outlined"
          secureTextEntry
        />

        <Divider style={styles.divider} />

        <Text variant="titleSmall">Guardian Information</Text>

        <TextInput
          label="Guardian Name"
          value={scholarData.guardianName}
          onChangeText={(text) => setScholarData({ ...scholarData, guardianName: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Guardian Phone"
          value={scholarData.guardianPhone}
          onChangeText={(text) => setScholarData({ ...scholarData, guardianPhone: text })}
          style={styles.input}
          mode="outlined"
          keyboardType="phone-pad"
        />

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
        >
          Next
        </Button>
      </Card.Content>
    </Card>
  );

  const renderStep2 = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.stepTitle}>Academic Information</Text>
        <Text variant="bodySmall" style={styles.stepSubtitle}>Step 2 of 3</Text>

        <TextInput
          label="Department *"
          value={scholarData.department}
          onChangeText={(text) => setScholarData({ ...scholarData, department: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Course/Program *"
          value={scholarData.course}
          onChangeText={(text) => setScholarData({ ...scholarData, course: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Year *"
          value={scholarData.year}
          onChangeText={(text) => setScholarData({ ...scholarData, year: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Section"
          value={scholarData.section}
          onChangeText={(text) => setScholarData({ ...scholarData, section: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Roll Number"
          value={scholarData.rollNumber}
          onChangeText={(text) => setScholarData({ ...scholarData, rollNumber: text })}
          style={styles.input}
          mode="outlined"
        />

        <Divider style={styles.divider} />

        <Text variant="titleSmall">Profile Photo</Text>
        
        <View style={styles.photoContainer}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <IconButton icon="account-circle" size={80} />
            </View>
          )}
          
          <Button
            mode="outlined"
            onPress={captureProfilePhoto}
            icon="camera"
            style={styles.photoButton}
          >
            Select Photo
          </Button>
        </View>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleBack}
            style={[styles.button, styles.halfButton]}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={handleNext}
            style={[styles.button, styles.halfButton]}
          >
            Next
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderStep3 = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.stepTitle}>Biometric Registration</Text>
        <Text variant="bodySmall" style={styles.stepSubtitle}>Step 3 of 3</Text>
        <Text variant="bodySmall" style={styles.helperText}>
          Select biometric type and capture biometric data for secure authentication
        </Text>

        <Text variant="titleSmall" style={styles.sectionTitle}>Biometric Type:</Text>
        <RadioButton.Group
          onValueChange={value => setBiometricType(value)}
          value={biometricType}
        >
          <View style={styles.radioItem}>
            <RadioButton value="face" />
            <Text>Face Recognition</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="fingerprint" />
            <Text>Fingerprint</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="both" />
            <Text>Both (Recommended)</Text>
          </View>
        </RadioButton.Group>

        <Divider style={styles.divider} />

        {(biometricType === 'face' || biometricType === 'both') && (
          <View style={styles.biometricSection}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Face Biometric</Text>
            {biometricData.faceImage ? (
              <View style={styles.capturedBiometric}>
                <Image source={{ uri: biometricData.faceImage }} style={styles.biometricImage} />
                <Text style={styles.capturedText}>✓ Face captured</Text>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={captureFace}
                icon="face-recognition"
                loading={loading}
                disabled={loading}
                style={styles.biometricButton}
              >
                Capture Face
              </Button>
            )}
          </View>
        )}

        {(biometricType === 'fingerprint' || biometricType === 'both') && (
          <View style={styles.biometricSection}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Fingerprint Biometric</Text>
            {biometricData.fingerprintData ? (
              <View style={styles.capturedBiometric}>
                <IconButton icon="fingerprint" size={60} />
                <Text style={styles.capturedText}>✓ Fingerprint captured</Text>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={captureFingerprint}
                icon="fingerprint"
                loading={loading}
                disabled={loading}
                style={styles.biometricButton}
              >
                Capture Fingerprint
              </Button>
            )}
          </View>
        )}

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleBack}
            style={[styles.button, styles.halfButton]}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || (!biometricData.faceCommitment && !biometricData.fingerprintCommitment)}
            style={[styles.button, styles.halfButton]}
          >
            Register Scholar
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Add Scholar" />
      </Appbar.Header>

      <ProgressBar
        progress={step / 3}
        color={theme.colors.primary}
        style={styles.progressBar}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>Add New Scholar</Text>
          
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressBar: {
    height: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepSubtitle: {
    color: '#666',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  halfButton: {
    flex: 0.48,
  },
  divider: {
    marginVertical: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  helperText: {
    color: '#666',
    marginBottom: 16,
  },
  biometricSection: {
    marginBottom: 16,
  },
  biometricButton: {
    marginTop: 8,
  },
  capturedBiometric: {
    alignItems: 'center',
    marginTop: 8,
  },
  biometricImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  capturedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoButton: {
    marginTop: 8,
  },
});

export default AddScholarScreen;

// // mobile/PramaanExpo/src/screens/AddScholarScreen.js
// // COMPLETE FILE WITH ALL FIXES

// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
//   Alert,
//   Image,
//   TouchableOpacity,
// } from 'react-native';
// import {
//   TextInput,
//   Button,
//   Card,
//   RadioButton,
//   HelperText,
//   Divider,
//   Chip,
//   Avatar,
//   IconButton,
//   ProgressBar,
// } from 'react-native-paper';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { MaterialIcons as Icon } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
// import { useAuth } from '../contexts/AuthContext';
// import { adminService } from '../services/api';
// import biometricService from '../services/biometricService';

// const AddScholarScreen = ({ navigation }) => {
//   const { user } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const [step, setStep] = useState(1);
//   const [biometricTypes, setBiometricTypes] = useState([]);

//   // Scholar data
//   const [scholarData, setScholarData] = useState({
//     scholarId: '',
//     name: '',
//     email: '',
//     phone: '',
//     password: '',
//     confirmPassword: '',
//     department: '',
//     course: '',
//     year: '',
//     section: '',
//     dateOfBirth: '',
//     gender: 'male',
//   });

//   // Guardian data
//   const [guardianData, setGuardianData] = useState({
//     name: '',
//     phone: '',
//     email: '',
//     relation: 'parent',
//   });

//   // Biometric data
//   const [biometricData, setBiometricData] = useState({
//     faceImage: null,
//     faceCommitment: null,
//     fingerprintData: null,
//     fingerprintCommitment: null,
//     selectedBiometric: 'both',
//   });

//   // Profile photo
//   const [profilePhoto, setProfilePhoto] = useState(null);

//   useEffect(() => {
//     checkBiometricAvailability();
//   }, []);

//   const checkBiometricAvailability = async () => {
//     try {
//       const result = await biometricService.checkBiometricAvailability();
//       if (result.available) {
//         setBiometricTypes(result.biometryType);
//       }
//     } catch (error) {
//       console.error('Error checking biometric availability:', error);
//     }
//   };

//   const validateStep1 = () => {
//     if (!scholarData.scholarId || !scholarData.name || !scholarData.email ||
//       !scholarData.phone || !scholarData.password) {
//       Alert.alert('Error', 'Please fill all required fields');
//       return false;
//     }

//     if (scholarData.password.length < 8) {
//       Alert.alert('Error', 'Password must be at least 8 characters');
//       return false;
//     }

//     if (scholarData.password !== scholarData.confirmPassword) {
//       Alert.alert('Error', 'Passwords do not match');
//       return false;
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(scholarData.email)) {
//       Alert.alert('Error', 'Please enter a valid email');
//       return false;
//     }

//     return true;
//   };

//   const validateStep2 = () => {
//     if (!scholarData.department || !scholarData.course || !scholarData.year) {
//       Alert.alert('Error', 'Please fill all academic details');
//       return false;
//     }
//     return true;
//   };

//   const handleNext = () => {
//     if (step === 1 && validateStep1()) {
//       setStep(2);
//     } else if (step === 2 && validateStep2()) {
//       setStep(3);
//     }
//   };

//   const handleBack = () => {
//     if (step > 1) {
//       setStep(step - 1);
//     }
//   };

//   const pickProfilePhoto = async () => {
//     try {
//       const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

//       if (!permissionResult.granted) {
//         Alert.alert('Permission Denied', 'Gallery permission is required');
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaType.Images,
//         allowsEditing: true,
//         aspect: [1, 1],
//         quality: 0.8,
//       });

//       if (!result.canceled && result.assets[0]) {
//         const imageUri = result.assets[0].uri;
//         setProfilePhoto(imageUri);
//       }
//     } catch (error) {
//       console.error('Error picking photo:', error);
//       Alert.alert('Error', 'Failed to pick photo');
//     }
//   };

//   const captureFace = async () => {
//     try {
//       setLoading(true);

//       // Request camera permission first
//       const { status } = await ImagePicker.requestCameraPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Permission Required', 'Camera permission is required to capture face');
//         setLoading(false);
//         return;
//       }

//       // Launch camera
//       const result = await ImagePicker.launchCameraAsync({
//         mediaTypes: ImagePicker.MediaType.Images,
//         allowsEditing: true,
//         aspect: [1, 1],
//         quality: 0.8,
//         base64: true,
//       });

//       if (!result.canceled && result.assets[0]) {
//         const asset = result.assets[0];
//         setBiometricData({
//           ...biometricData,
//           faceImage: asset.uri,
//         });

//         // Generate commitment - this returns a string
//         const commitment = await biometricService.generateBiometricCommitment({
//           uri: asset.uri,
//           base64: asset.base64,
//           type: 'face',
//           timestamp: Date.now(),
//         });

//         setBiometricData(prev => ({
//           ...prev,
//           faceCommitment: commitment, // This is already a string
//         }));

//         Alert.alert('Success', 'Face captured successfully');
//       }
//     } catch (error) {
//       console.error('Face capture error:', error);
//       Alert.alert('Error', 'Failed to capture face photo');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const captureFingerprint = async () => {
//     try {
//       setLoading(true);
//       const result = await biometricService.captureFingerprint();

//       if (result.success) {
//         setBiometricData({
//           ...biometricData,
//           fingerprintData: result.data,
//         });

//         // Generate commitment - this returns a string
//         const commitment = await biometricService.generateBiometricCommitment({
//           type: 'fingerprint',
//           timestamp: Date.now(),
//           data: result.data,
//         });
        
//         setBiometricData(prev => ({
//           ...prev,
//           fingerprintCommitment: commitment, // This is already a string
//         }));

//         Alert.alert('Success', 'Fingerprint captured successfully');
//       } else {
//         Alert.alert('Error', result.error || 'Failed to capture fingerprint');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to capture fingerprint');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async () => {
//     try {
//       // Prevent double submission
//       if (loading) {
//         return;
//       }

//       setLoading(true);

//       // Validate biometric data
//       if (biometricData.selectedBiometric === 'both' || biometricData.selectedBiometric === 'face') {
//         if (!biometricData.faceCommitment) {
//           Alert.alert('Error', 'Please capture face biometric');
//           setLoading(false);
//           return;
//         }
//       }

//       if (biometricData.selectedBiometric === 'both' || biometricData.selectedBiometric === 'fingerprint') {
//         if (!biometricData.fingerprintCommitment) {
//           Alert.alert('Error', 'Please capture fingerprint biometric');
//           setLoading(false);
//           return;
//         }
//       }

//       // Get organizationId from user context
//       const organizationId = user?.organizationId || user?.organization?.id || user?.organization?._id;

//       if (!organizationId) {
//         Alert.alert('Error', 'Organization ID not found. Please login again.');
//         setLoading(false);
//         return;
//       }

//       // Prepare biometrics object - Send commitment strings
//       let biometrics = {};
      
//       if (biometricData.faceCommitment) {
//         // The commitment is already a string from generateBiometricCommitment
//         biometrics.faceCommitment = biometricData.faceCommitment;
//       }
      
//       if (biometricData.fingerprintCommitment) {
//         // The commitment is already a string from generateBiometricCommitment
//         biometrics.fingerprintCommitment = biometricData.fingerprintCommitment;
//       }

//       // Prepare submission data
//       const submissionData = {
//         scholarId: scholarData.scholarId.toUpperCase(),
//         personalInfo: {
//           name: scholarData.name,
//           email: scholarData.email.toLowerCase(),
//           phone: scholarData.phone,
//           dateOfBirth: scholarData.dateOfBirth,
//           gender: scholarData.gender,
//           profilePhoto: profilePhoto,
//         },
//         academicInfo: {
//           department: scholarData.department,
//           course: scholarData.course,
//           year: scholarData.year,
//           section: scholarData.section,
//           rollNumber: scholarData.rollNumber || '',
//         },
//         guardianInfo: guardianData,
//         password: scholarData.password,
//         biometrics: biometrics, // Now contains string commitments
//         organizationId: organizationId,
//       };

//       console.log('Submitting scholar data with organizationId:', organizationId);
//       console.log('Biometrics data:', biometrics); // Debug log

//       const response = await adminService.addScholar(submissionData);

//       // Check for success - API returns 201 status which means created successfully
//       if (response || response.success !== false) {
//         Alert.alert(
//           'Success',
//           `Scholar ${scholarData.name} has been registered successfully!`,
//           [
//             {
//               text: 'OK',
//               onPress: () => {
//                 // Reset form and navigate back
//                 navigation.goBack();
//               }
//             }
//           ]
//         );
//       } else {
//         Alert.alert('Error', response.error || response.message || 'Failed to register scholar');
//       }
//     } catch (error) {
//       console.error('Registration error:', error);

//       // Check for duplicate error
//       if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
//         Alert.alert(
//           'Duplicate Scholar',
//           'A scholar with this ID or email already exists. Please use different credentials.'
//         );
//       } else if (error.response?.status === 409) {
//         // Handle biometric duplicate errors
//         Alert.alert(
//           'Biometric Already Registered',
//           error.response?.data?.message || 'This biometric is already registered in the system.'
//         );
//       } else {
//         Alert.alert(
//           'Error',
//           error.response?.data?.message || error.message || 'Failed to register scholar'
//         );
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderStep1 = () => (
//     <Card style={styles.card}>
//       <Card.Title title="Personal Information" subtitle="Step 1 of 3" />
//       <Card.Content>
//         <TextInput
//           label="Scholar ID *"
//           value={scholarData.scholarId}
//           onChangeText={(text) => setScholarData({ ...scholarData, scholarId: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Full Name *"
//           value={scholarData.name}
//           onChangeText={(text) => setScholarData({ ...scholarData, name: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Email *"
//           value={scholarData.email}
//           onChangeText={(text) => setScholarData({ ...scholarData, email: text })}
//           style={styles.input}
//           mode="outlined"
//           keyboardType="email-address"
//           autoCapitalize="none"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Phone Number *"
//           value={scholarData.phone}
//           onChangeText={(text) => setScholarData({ ...scholarData, phone: text })}
//           style={styles.input}
//           mode="outlined"
//           keyboardType="phone-pad"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Date of Birth"
//           value={scholarData.dateOfBirth}
//           onChangeText={(text) => setScholarData({ ...scholarData, dateOfBirth: text })}
//           style={styles.input}
//           mode="outlined"
//           placeholder="DD/MM/YYYY"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <Text style={styles.radioLabel}>Gender:</Text>
//         <RadioButton.Group
//           onValueChange={(value) => setScholarData({ ...scholarData, gender: value })}
//           value={scholarData.gender}
//         >
//           <View style={styles.radioRow}>
//             <RadioButton.Item label="Male" value="male" />
//             <RadioButton.Item label="Female" value="female" />
//             <RadioButton.Item label="Other" value="other" />
//           </View>
//         </RadioButton.Group>

//         <Divider style={styles.divider} />

//         <TextInput
//           label="Password *"
//           value={scholarData.password}
//           onChangeText={(text) => setScholarData({ ...scholarData, password: text })}
//           style={styles.input}
//           mode="outlined"
//           secureTextEntry
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Confirm Password *"
//           value={scholarData.confirmPassword}
//           onChangeText={(text) => setScholarData({ ...scholarData, confirmPassword: text })}
//           style={styles.input}
//           mode="outlined"
//           secureTextEntry
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <Divider style={styles.divider} />

//         <Text style={styles.sectionTitle}>Guardian Information</Text>

//         <TextInput
//           label="Guardian Name"
//           value={guardianData.name}
//           onChangeText={(text) => setGuardianData({ ...guardianData, name: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Guardian Phone"
//           value={guardianData.phone}
//           onChangeText={(text) => setGuardianData({ ...guardianData, phone: text })}
//           style={styles.input}
//           mode="outlined"
//           keyboardType="phone-pad"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <Text style={styles.radioLabel}>Relation:</Text>
//         <RadioButton.Group
//           onValueChange={(value) => setGuardianData({ ...guardianData, relation: value })}
//           value={guardianData.relation}
//         >
//           <View style={styles.radioRow}>
//             <RadioButton.Item label="Parent" value="parent" />
//             <RadioButton.Item label="Guardian" value="guardian" />
//           </View>
//         </RadioButton.Group>
//       </Card.Content>
//     </Card>
//   );

//   const renderStep2 = () => (
//     <Card style={styles.card}>
//       <Card.Title title="Academic Information" subtitle="Step 2 of 3" />
//       <Card.Content>
//         <TextInput
//           label="Department *"
//           value={scholarData.department}
//           onChangeText={(text) => setScholarData({ ...scholarData, department: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Course *"
//           value={scholarData.course}
//           onChangeText={(text) => setScholarData({ ...scholarData, course: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Year *"
//           value={scholarData.year}
//           onChangeText={(text) => setScholarData({ ...scholarData, year: text })}
//           style={styles.input}
//           mode="outlined"
//           keyboardType="numeric"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Section"
//           value={scholarData.section}
//           onChangeText={(text) => setScholarData({ ...scholarData, section: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <TextInput
//           label="Roll Number"
//           value={scholarData.rollNumber}
//           onChangeText={(text) => setScholarData({ ...scholarData, rollNumber: text })}
//           style={styles.input}
//           mode="outlined"
//           outlineColor="#6C63FF"
//           activeOutlineColor="#6C63FF"
//         />

//         <View style={styles.photoSection}>
//           <Text style={styles.sectionTitle}>Profile Photo</Text>
//           {profilePhoto ? (
//             <View style={styles.photoContainer}>
//               <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
//               <IconButton
//                 icon="close"
//                 size={20}
//                 onPress={() => setProfilePhoto(null)}
//                 style={styles.removePhotoButton}
//               />
//             </View>
//           ) : (
//             <Button
//               mode="outlined"
//               onPress={pickProfilePhoto}
//               icon="camera"
//               style={styles.photoButton}
//             >
//               Select Photo
//             </Button>
//           )}
//         </View>
//       </Card.Content>
//     </Card>
//   );

//   const renderStep3 = () => (
//     <Card style={styles.card}>
//       <Card.Title title="Biometric Registration" subtitle="Step 3 of 3" />
//       <Card.Content>
//         <Text style={styles.biometricInfo}>
//           Select biometric type and capture biometric data for secure authentication
//         </Text>

//         <Text style={styles.radioLabel}>Biometric Type:</Text>
//         <RadioButton.Group
//           onValueChange={(value) => setBiometricData({ ...biometricData, selectedBiometric: value })}
//           value={biometricData.selectedBiometric}
//         >
//           <RadioButton.Item label="Face Recognition" value="face" />
//           <RadioButton.Item label="Fingerprint" value="fingerprint" />
//           <RadioButton.Item label="Both" value="both" />
//         </RadioButton.Group>

//         <Divider style={styles.divider} />

//         {(biometricData.selectedBiometric === 'face' || biometricData.selectedBiometric === 'both') && (
//           <View style={styles.biometricSection}>
//             <Text style={styles.sectionTitle}>Face Biometric</Text>
//             {biometricData.faceCommitment ? (
//               <View style={styles.capturedBiometric}>
//                 {biometricData.faceImage && (
//                   <Image source={{ uri: biometricData.faceImage }} style={styles.biometricImage} />
//                 )}
//                 <Chip icon="check-circle" style={styles.successChip}>Face Captured</Chip>
//               </View>
//             ) : (
//               <Button
//                 mode="outlined"
//                 onPress={captureFace}
//                 loading={loading}
//                 disabled={loading}
//                 icon="face-recognition"
//                 style={styles.captureButton}
//               >
//                 Capture Face
//               </Button>
//             )}
//           </View>
//         )}

//         {(biometricData.selectedBiometric === 'fingerprint' || biometricData.selectedBiometric === 'both') && (
//           <View style={styles.biometricSection}>
//             <Text style={styles.sectionTitle}>Fingerprint Biometric</Text>
//             {biometricData.fingerprintCommitment ? (
//               <View style={styles.capturedBiometric}>
//                 <Icon name="fingerprint" size={80} color="#4CAF50" />
//                 <Chip icon="check-circle" style={styles.successChip}>Fingerprint Captured</Chip>
//               </View>
//             ) : (
//               <Button
//                 mode="outlined"
//                 onPress={captureFingerprint}
//                 loading={loading}
//                 disabled={loading}
//                 icon="fingerprint"
//                 style={styles.captureButton}
//               >
//                 Capture Fingerprint
//               </Button>
//             )}
//           </View>
//         )}
//       </Card.Content>
//     </Card>
//   );

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Icon
//           name="arrow-back"
//           size={24}
//           onPress={() => navigation.goBack()}
//         />
//         <Text style={styles.headerTitle}>Add New Scholar</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.container}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           <ProgressBar progress={step / 3} style={styles.progressBar} />

//           {step === 1 && renderStep1()}
//           {step === 2 && renderStep2()}
//           {step === 3 && renderStep3()}

//           <View style={styles.buttonContainer}>
//             {step > 1 && (
//               <Button
//                 mode="outlined"
//                 onPress={handleBack}
//                 style={styles.button}
//                 disabled={loading}
//               >
//                 Back
//               </Button>
//             )}

//             {step < 3 ? (
//               <Button
//                 mode="contained"
//                 onPress={handleNext}
//                 style={[styles.button, styles.primaryButton]}
//                 contentStyle={styles.buttonContent}
//               >
//                 Next
//               </Button>
//             ) : (
//               <Button
//                 mode="contained"
//                 onPress={handleSubmit}
//                 style={[styles.button, styles.primaryButton]}
//                 contentStyle={styles.buttonContent}
//                 loading={loading}
//                 disabled={loading}
//               >
//                 Register Scholar
//               </Button>
//             )}
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     padding: 16,
//     backgroundColor: 'white',
//     elevation: 2,
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   scrollContent: {
//     paddingBottom: 20,
//   },
//   progressBar: {
//     margin: 16,
//     height: 6,
//     backgroundColor: '#E0E0E0',
//   },
//   card: {
//     margin: 16,
//     elevation: 2,
//   },
//   input: {
//     marginBottom: 12,
//   },
//   radioLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 8,
//     color: '#333',
//   },
//   radioRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },
//   divider: {
//     marginVertical: 16,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 12,
//     color: '#333',
//   },
//   photoSection: {
//     marginTop: 16,
//   },
//   photoContainer: {
//     position: 'relative',
//     alignSelf: 'center',
//   },
//   profilePhoto: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//   },
//   removePhotoButton: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     backgroundColor: 'white',
//     elevation: 2,
//   },
//   photoButton: {
//     marginTop: 8,
//   },
//   biometricInfo: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 16,
//   },
//   biometricSection: {
//     marginTop: 16,
//   },
//   captureButton: {
//     marginTop: 8,
//   },
//   capturedBiometric: {
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   biometricImage: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     marginBottom: 12,
//   },
//   successChip: {
//     backgroundColor: '#E8F5E9',
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     margin: 16,
//     gap: 16,
//   },
//   button: {
//     flex: 1,
//   },
//   primaryButton: {
//     backgroundColor: '#6C63FF',
//   },
//   buttonContent: {
//     paddingVertical: 8,
//   },
// });

// export default AddScholarScreen;