// mobile/PramaanExpo/src/screens/AddScholarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  RadioButton,
  HelperText,
  Divider,
  Chip,
  Avatar,
  IconButton,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';
// Fixed import - using .js extension explicitly
import biometricService from '../services/biometric.service.js';

const AddScholarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [biometricTypes, setBiometricTypes] = useState([]);
  
  // Scholar data
  const [scholarData, setScholarData] = useState({
    scholarId: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    department: '',
    course: '',
    year: '',
    section: '',
  });

  // Biometric data
  const [biometricData, setBiometricData] = useState({
    faceImage: null,
    faceCommitment: null,
    fingerprintData: null,
    fingerprintCommitment: null,
    selectedBiometric: 'both', // 'face', 'fingerprint', or 'both'
  });

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const result = await biometricService.checkBiometricAvailability();
      if (result.available) {
        setBiometricTypes(result.biometryType);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const validateStep1 = () => {
    if (!scholarData.scholarId || !scholarData.name || !scholarData.email || 
        !scholarData.phone || !scholarData.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return false;
    }

    if (scholarData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }

    if (scholarData.password !== scholarData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
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

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const captureFace = async () => {
    try {
      setLoading(true);
      const result = await biometricService.captureFacePhoto();
      
      if (result.success) {
        setBiometricData({
          ...biometricData,
          faceImage: result.data.uri,
        });
        
        // Generate commitment
        const { commitment, nullifier } = await biometricService.generateBiometricCommitment(result.data);
        setBiometricData(prev => ({
          ...prev,
          faceCommitment: { commitment, nullifier },
        }));
        
        Alert.alert('Success', 'Face captured successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to capture face');
      }
    } catch (error) {
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
        });
        
        // Generate commitment
        const { commitment, nullifier } = await biometricService.generateBiometricCommitment(result.data);
        setBiometricData(prev => ({
          ...prev,
          fingerprintCommitment: { commitment, nullifier },
        }));
        
        Alert.alert('Success', 'Fingerprint captured successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to capture fingerprint');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate biometric data
      if (biometricData.selectedBiometric === 'both' || biometricData.selectedBiometric === 'face') {
        if (!biometricData.faceCommitment) {
          Alert.alert('Error', 'Please capture face biometric');
          return;
        }
      }

      if (biometricData.selectedBiometric === 'both' || biometricData.selectedBiometric === 'fingerprint') {
        if (!biometricData.fingerprintCommitment) {
          Alert.alert('Error', 'Please capture fingerprint biometric');
          return;
        }
      }

      // Prepare submission data
      const submissionData = {
        scholarId: scholarData.scholarId.toUpperCase(),
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
        },
        password: scholarData.password,
        biometrics: {
          faceCommitment: biometricData.faceCommitment,
          fingerprintCommitment: biometricData.fingerprintCommitment,
        },
      };

      const response = await adminService.registerScholar(submissionData);

      if (response.success) {
        Alert.alert(
          'Success', 
          'Scholar registered successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to register scholar');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Failed to register scholar');
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
          mode="outlined"
          style={styles.input}
          autoCapitalize="characters"
        />

        <TextInput
          label="Full Name *"
          value={scholarData.name}
          onChangeText={(text) => setScholarData({ ...scholarData, name: text })}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Email *"
          value={scholarData.email}
          onChangeText={(text) => setScholarData({ ...scholarData, email: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Phone Number *"
          value={scholarData.phone}
          onChangeText={(text) => setScholarData({ ...scholarData, phone: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Password *"
          value={scholarData.password}
          onChangeText={(text) => setScholarData({ ...scholarData, password: text })}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />

        <TextInput
          label="Confirm Password *"
          value={scholarData.confirmPassword}
          onChangeText={(text) => setScholarData({ ...scholarData, confirmPassword: text })}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity onPress={pickProfilePhoto} style={styles.photoButton}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="add-a-photo" size={40} color="#666" />
              <Text style={styles.photoText}>Add Profile Photo</Text>
            </View>
          )}
        </TouchableOpacity>
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
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Course *"
          value={scholarData.course}
          onChangeText={(text) => setScholarData({ ...scholarData, course: text })}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Year *"
          value={scholarData.year}
          onChangeText={(text) => setScholarData({ ...scholarData, year: text })}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Section"
          value={scholarData.section}
          onChangeText={(text) => setScholarData({ ...scholarData, section: text })}
          mode="outlined"
          style={styles.input}
        />
      </Card.Content>
    </Card>
  );

  const renderStep3 = () => (
    <Card style={styles.card}>
      <Card.Title title="Biometric Enrollment" subtitle="Step 3 of 3" />
      <Card.Content>
        <Text style={styles.sectionTitle}>Select Biometric Type</Text>
        <RadioButton.Group
          onValueChange={value => setBiometricData({ ...biometricData, selectedBiometric: value })}
          value={biometricData.selectedBiometric}
        >
          <View style={styles.radioItem}>
            <RadioButton value="face" />
            <Text>Face Only</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="fingerprint" />
            <Text>Fingerprint Only</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="both" />
            <Text>Both (Recommended)</Text>
          </View>
        </RadioButton.Group>

        <Divider style={styles.divider} />

        {(biometricData.selectedBiometric === 'face' || biometricData.selectedBiometric === 'both') && (
          <View style={styles.biometricSection}>
            <Text style={styles.sectionTitle}>Face Biometric</Text>
            {biometricData.faceImage ? (
              <View style={styles.capturedBiometric}>
                <Image source={{ uri: biometricData.faceImage }} style={styles.biometricImage} />
                <Chip icon="check-circle" style={styles.successChip}>Face Captured</Chip>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={captureFace}
                loading={loading}
                disabled={loading}
                icon="face-recognition"
                style={styles.captureButton}
              >
                Capture Face
              </Button>
            )}
          </View>
        )}

        {(biometricData.selectedBiometric === 'fingerprint' || biometricData.selectedBiometric === 'both') && (
          <View style={styles.biometricSection}>
            <Text style={styles.sectionTitle}>Fingerprint Biometric</Text>
            {biometricData.fingerprintCommitment ? (
              <View style={styles.capturedBiometric}>
                <Icon name="fingerprint" size={80} color="#4CAF50" />
                <Chip icon="check-circle" style={styles.successChip}>Fingerprint Captured</Chip>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={captureFingerprint}
                loading={loading}
                disabled={loading}
                icon="fingerprint"
                style={styles.captureButton}
              >
                Capture Fingerprint
              </Button>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ProgressBar progress={step / 3} style={styles.progressBar} />
          
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <View style={styles.buttonContainer}>
            {step > 1 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                style={styles.button}
                disabled={loading}
              >
                Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button
                mode="contained"
                onPress={handleNext}
                style={[styles.button, styles.primaryButton]}
                disabled={loading}
              >
                Next
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={[styles.button, styles.primaryButton]}
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
  scrollContent: {
    padding: 16,
  },
  progressBar: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  primaryButton: {
    marginLeft: 8,
  },
  photoButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoText: {
    marginTop: 8,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  biometricSection: {
    marginBottom: 20,
  },
  captureButton: {
    marginTop: 8,
  },
  capturedBiometric: {
    alignItems: 'center',
    marginTop: 8,
  },
  biometricImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 12,
  },
  successChip: {
    backgroundColor: '#E8F5E9',
  },
});

export default AddScholarScreen;