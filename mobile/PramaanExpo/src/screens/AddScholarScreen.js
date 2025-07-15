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
import { adminService } from '../services/api';
import biometricService from '../services/biometricService';

const AddScholarScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const authContext = useAuth(); // Fixed: was using just 'user', should use authContext
  
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
    dateOfBirth: '',
    gender: 'male',
  });

  // Guardian data
  const [guardianData, setGuardianData] = useState({
    name: '',
    phone: '',
    email: '',
    relation: 'parent',
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

    if (scholarData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
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
        mediaTypes: 'Images', // Fixed: Using string directly
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
        mediaTypes: 'Images', // Fixed: Using string directly
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
          type: 'face',
        });

        setBiometricData(prev => ({
          ...prev,
          faceCommitment: commitmentData, // This is already a string
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
        // Generate commitment
        const commitment = await biometricService.generateBiometricCommitment({
          type: 'fingerprint',
          timestamp: Date.now(),
          data: result.data,
        });

        setBiometricData(prev => ({
          ...prev,
          fingerprintData: result.data,
          fingerprintCommitment: commitment, // This is already a string
        }));

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

      // Validate that we have organization ID
      const { organizationId } = authContext.user || {};
      if (!organizationId) {
        Alert.alert('Error', 'Organization information not found. Please login again.');
        setLoading(false);
        return;
      }

      // Prepare submission data - matching backend expectations
      const submissionData = {
        scholarId: scholarData.scholarId.toUpperCase(),
        personalInfo: {
          name: scholarData.name,
          email: scholarData.email.toLowerCase(),
          phone: scholarData.phone,
          dateOfBirth: scholarData.dateOfBirth,
          gender: scholarData.gender,
          profilePhoto: profilePhoto, // base64 image if captured
        },
        academicInfo: {
          department: scholarData.department,
          course: scholarData.course,
          year: scholarData.year,
          section: scholarData.section || '',
          rollNumber: scholarData.rollNumber || '',
        },
        guardianInfo: {
          name: guardianData.name || '',
          phone: guardianData.phone || '',
          email: guardianData.email || '',
          relation: guardianData.relation || 'parent',
        },
        password: scholarData.password, // Backend will hash this
        // Remove biometrics from initial registration - they'll enroll separately
        organizationId: organizationId,
      };

      console.log('Submitting scholar data with organizationId:', organizationId);
      console.log('Sending scholar data to backend:', {
        scholarId: submissionData.scholarId,
        hasPersonalInfo: !!submissionData.personalInfo,
        hasAcademicInfo: !!submissionData.academicInfo,
        hasBiometrics: false, // No biometrics in initial registration
      });

      const response = await adminService.addScholar(submissionData);

      // Check for success
      if (response && response.success !== false) {
        Alert.alert(
          'Success',
          `Scholar ${scholarData.name} has been registered successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form and navigate back
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || response.message || 'Failed to register scholar');
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Add scholar error:', error);

      // Check for specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message;
        
        if (errorMessage?.includes('already exists')) {
          Alert.alert(
            'Duplicate Scholar',
            'A scholar with this ID or email already exists. Please use different credentials.'
          );
        } else if (error.response?.data?.errors) {
          // Handle validation errors
          const validationErrors = error.response.data.errors
            .map(err => err.msg || err.message)
            .join('\n');
          Alert.alert('Validation Error', validationErrors);
        } else {
          Alert.alert('Error', errorMessage || 'Failed to register scholar');
        }
      } else if (error.request) {
        Alert.alert(
          'Network Error',
          'Unable to reach the server. Please check your connection and try again.'
        );
      } else {
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.'
        );
      }
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
          value={guardianData.name}
          onChangeText={(text) => setGuardianData({ ...guardianData, name: text })}
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Guardian Phone"
          value={guardianData.phone}
          onChangeText={(text) => setGuardianData({ ...guardianData, phone: text })}
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
            Take Photo
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
        <Text variant="titleMedium" style={styles.stepTitle}>Review & Submit</Text>
        <Text variant="bodySmall" style={styles.stepSubtitle}>Step 3 of 3</Text>
        <Text variant="bodySmall" style={styles.helperText}>
          Review scholar information before submitting. Biometric enrollment will be done by the scholar after login.
        </Text>

        <View style={styles.reviewSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Personal Information</Text>
          <Text>Scholar ID: {scholarData.scholarId}</Text>
          <Text>Name: {scholarData.name}</Text>
          <Text>Email: {scholarData.email}</Text>
          <Text>Phone: {scholarData.phone}</Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.reviewSection}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Academic Information</Text>
          <Text>Department: {scholarData.department}</Text>
          <Text>Course: {scholarData.course}</Text>
          <Text>Year: {scholarData.year}</Text>
          {scholarData.section && <Text>Section: {scholarData.section}</Text>}
          {scholarData.rollNumber && <Text>Roll Number: {scholarData.rollNumber}</Text>}
        </View>

        {(guardianData.name || guardianData.phone) && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.reviewSection}>
              <Text variant="titleSmall" style={styles.sectionTitle}>Guardian Information</Text>
              {guardianData.name && <Text>Name: {guardianData.name}</Text>}
              {guardianData.phone && <Text>Phone: {guardianData.phone}</Text>}
            </View>
          </>
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
            disabled={loading}
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
  reviewSection: {
    marginBottom: 16,
  },
});

export default AddScholarScreen;