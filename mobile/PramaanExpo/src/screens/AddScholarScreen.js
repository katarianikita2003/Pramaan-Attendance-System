// mobile/PramaanExpo/src/screens/AddScholarScreen.js - FIXED VERSION
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  TextInput,
  Button,
  HelperText,
  Stepper,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
// import * as ImagePicker from 'expo-image-picker';
import { showImagePickerOptions } from '../utils/imagePickerHelper';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';
import zkpService from '../services/zkpService';

const AddScholarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Scholar data
  const [scholarData, setScholarData] = useState({
    scholarId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    course: '',
    year: '',
    section: '',
    password: '',
    confirmPassword: '',
  });

  // Biometric data
  const [biometricData, setBiometricData] = useState({
    faceCommitment: null,
    fingerprintCommitment: null,
    faceCaptured: false,
    fingerprintCaptured: false,
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Personal Information
        if (!scholarData.scholarId) newErrors.scholarId = 'Scholar ID is required';
        if (!scholarData.name) newErrors.name = 'Name is required';
        if (!scholarData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(scholarData.email)) {
          newErrors.email = 'Invalid email address';
        }
        if (!scholarData.phone) newErrors.phone = 'Phone number is required';
        else if (!/^\d{10}$/.test(scholarData.phone)) {
          newErrors.phone = 'Phone number must be 10 digits';
        }
        break;

      case 1: // Academic Information
        if (!scholarData.department) newErrors.department = 'Department is required';
        if (!scholarData.course) newErrors.course = 'Course is required';
        if (!scholarData.year) newErrors.year = 'Year is required';
        if (!scholarData.section) newErrors.section = 'Section is required';
        if (!scholarData.password) newErrors.password = 'Password is required';
        else if (scholarData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (scholarData.password !== scholarData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;

      case 2: // Biometric Capture
        if (!profilePhoto) newErrors.profilePhoto = 'Profile photo is required';
        if (!biometricData.faceCaptured) newErrors.face = 'Face biometric is required';
        if (!biometricData.fingerprintCaptured) newErrors.fingerprint = 'Fingerprint is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleImagePicker = async () => {
    const image = await showImagePickerOptions({
      aspect: [1, 1],
      quality: 0.8,
    });

    if (image) {
      setProfilePhoto(image.uri);
    }
  };

  const handleFaceCapture = async () => {
    try {
      setLoading(true);
      // Simulate face capture and ZKP commitment generation
      const faceData = await zkpService.captureFace();
      const commitment = await zkpService.generateCommitment(faceData, 'face');

      setBiometricData({
        ...biometricData,
        faceCommitment: commitment,
        faceCaptured: true,
      });

      Alert.alert('Success', 'Face biometric captured successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to capture face biometric');
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintCapture = async () => {
    try {
      setLoading(true);
      // Simulate fingerprint capture and ZKP commitment generation
      const fingerprintData = await zkpService.captureFingerprint();
      const commitment = await zkpService.generateCommitment(fingerprintData, 'fingerprint');

      setBiometricData({
        ...biometricData,
        fingerprintCommitment: commitment,
        fingerprintCaptured: true,
      });

      Alert.alert('Success', 'Fingerprint captured successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to capture fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!validateStep(2)) {
        Alert.alert('Error', 'Please complete all required fields');
        return;
      }

      setLoading(true);
      console.log('Submitting scholar registration...');

      // Prepare the data according to backend expectations
      const registrationData = {
        scholarId: scholarData.scholarId.trim().toUpperCase(),
        personalInfo: {
          name: scholarData.name.trim(),
          email: scholarData.email.trim().toLowerCase(),
          phone: scholarData.phone.trim(),
          profileImage: profilePhoto, // The backend will handle file upload
        },
        academicInfo: {
          department: scholarData.department.trim(),
          course: scholarData.course.trim(),
          year: scholarData.year.trim(),
          section: scholarData.section.trim().toUpperCase(),
        },
        password: scholarData.password,
        organizationId: user?.organizationId, // Include organization ID from logged-in admin
        biometrics: {
          faceCommitment: biometricData.faceCommitment,
          fingerprintCommitment: biometricData.fingerprintCommitment,
        },
      };

      console.log('Registration data prepared:', {
        ...registrationData,
        password: '[HIDDEN]',
        personalInfo: {
          ...registrationData.personalInfo,
          profileImage: registrationData.personalInfo.profileImage ? '[IMAGE]' : null
        }
      });

      const response = await adminService.addScholar(registrationData);

      console.log('Registration response:', response);

      if (response.success) {
        Alert.alert(
          'Success',
          `Scholar registered successfully!\n\nScholar ID: ${scholarData.scholarId}\nEmail: ${scholarData.email}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to register scholar');
      }
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to register scholar';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card style={styles.card}>
      <Card.Title title="Personal Information" subtitle="Step 1 of 3" />
      <Card.Content>
        <TextInput
          label="Scholar ID *"
          value={scholarData.scholarId}
          onChangeText={(text) => setScholarData({ ...scholarData, scholarId: text })}
          style={styles.input}
          mode="outlined"
          error={!!errors.scholarId}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.scholarId}>
          {errors.scholarId}
        </HelperText>

        <TextInput
          label="Full Name *"
          value={scholarData.name}
          onChangeText={(text) => setScholarData({ ...scholarData, name: text })}
          style={styles.input}
          mode="outlined"
          error={!!errors.name}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.name}>
          {errors.name}
        </HelperText>

        <TextInput
          label="Email *"
          value={scholarData.email}
          onChangeText={(text) => setScholarData({ ...scholarData, email: text })}
          style={styles.input}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!errors.email}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.email}>
          {errors.email}
        </HelperText>

        <TextInput
          label="Phone Number *"
          value={scholarData.phone}
          onChangeText={(text) => setScholarData({ ...scholarData, phone: text })}
          style={styles.input}
          mode="outlined"
          keyboardType="phone-pad"
          error={!!errors.phone}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.phone}>
          {errors.phone}
        </HelperText>
      </Card.Content>
    </Card>
  );

  const renderStep2 = () => (
    <Card style={styles.card}>
      <Card.Title title="Academic Information" subtitle="Step 2 of 3" />
      <Card.Content>
        <TextInput
          label="Department *"
          value={scholarData.department}
          onChangeText={(text) => setScholarData({ ...scholarData, department: text })}
          style={styles.input}
          mode="outlined"
          error={!!errors.department}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.department}>
          {errors.department}
        </HelperText>

        <TextInput
          label="Course *"
          value={scholarData.course}
          onChangeText={(text) => setScholarData({ ...scholarData, course: text })}
          style={styles.input}
          mode="outlined"
          error={!!errors.course}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.course}>
          {errors.course}
        </HelperText>

        <TextInput
          label="Year *"
          value={scholarData.year}
          onChangeText={(text) => setScholarData({ ...scholarData, year: text })}
          style={styles.input}
          mode="outlined"
          error={!!errors.year}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.year}>
          {errors.year}
        </HelperText>

        <TextInput
          label="Section *"
          value={scholarData.section}
          onChangeText={(text) => setScholarData({ ...scholarData, section: text })}
          style={styles.input}
          mode="outlined"
          error={!!errors.section}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.section}>
          {errors.section}
        </HelperText>

        <TextInput
          label="Password *"
          value={scholarData.password}
          onChangeText={(text) => setScholarData({ ...scholarData, password: text })}
          style={styles.input}
          mode="outlined"
          secureTextEntry
          error={!!errors.password}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.password}>
          {errors.password}
        </HelperText>

        <TextInput
          label="Confirm Password *"
          value={scholarData.confirmPassword}
          onChangeText={(text) => setScholarData({ ...scholarData, confirmPassword: text })}
          style={styles.input}
          mode="outlined"
          secureTextEntry
          error={!!errors.confirmPassword}
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        <HelperText type="error" visible={!!errors.confirmPassword}>
          {errors.confirmPassword}
        </HelperText>
      </Card.Content>
    </Card>
  );

  const renderStep3 = () => (
    <Card style={styles.card}>
      <Card.Title title="Biometric Capture" subtitle="Step 3 of 3" />
      <Card.Content>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Profile Photo *</Text>
          <TouchableOpacity onPress={handleImagePicker} style={styles.photoContainer}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Icon name="camera-alt" size={40} color="#666" />
                <Text style={styles.photoText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <HelperText type="error" visible={!!errors.profilePhoto}>
            {errors.profilePhoto}
          </HelperText>
        </View>

        {/* Face Biometric */}
        <View style={styles.biometricSection}>
          <Text style={styles.sectionTitle}>Face Biometric *</Text>
          <Button
            mode={biometricData.faceCaptured ? "outlined" : "contained"}
            onPress={handleFaceCapture}
            style={styles.biometricButton}
            icon={biometricData.faceCaptured ? "check-circle" : "face"}
            loading={loading}
            disabled={loading}
          >
            {biometricData.faceCaptured ? 'Face Captured' : 'Capture Face'}
          </Button>
          <HelperText type="error" visible={!!errors.face}>
            {errors.face}
          </HelperText>
        </View>

        {/* Fingerprint Biometric */}
        <View style={styles.biometricSection}>
          <Text style={styles.sectionTitle}>Fingerprint *</Text>
          <Button
            mode={biometricData.fingerprintCaptured ? "outlined" : "contained"}
            onPress={handleFingerprintCapture}
            style={styles.biometricButton}
            icon={biometricData.fingerprintCaptured ? "check-circle" : "fingerprint"}
            loading={loading}
            disabled={loading}
          >
            {biometricData.fingerprintCaptured ? 'Fingerprint Captured' : 'Capture Fingerprint'}
          </Button>
          <HelperText type="error" visible={!!errors.fingerprint}>
            {errors.fingerprint}
          </HelperText>
        </View>
      </Card.Content>
    </Card>
  );

  const steps = [renderStep1, renderStep2, renderStep3];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Scholar</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[0, 1, 2].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressDot,
                  currentStep >= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* Current Step */}
          {steps[currentStep]()}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                style={styles.button}
                disabled={loading}
              >
                Back
              </Button>
            )}

            {currentStep < 2 ? (
              <Button
                mode="contained"
                onPress={handleNext}
                style={[styles.button, currentStep === 0 && styles.fullWidthButton]}
                disabled={loading}
              >
                Next
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                Register Scholar
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#6C63FF',
    width: 30,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  fullWidthButton: {
    marginHorizontal: 0,
  },
  photoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  photoContainer: {
    alignItems: 'center',
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoText: {
    marginTop: 10,
    color: '#666',
  },
  biometricSection: {
    marginBottom: 20,
  },
  biometricButton: {
    marginTop: 10,
  },
});

export default AddScholarScreen;