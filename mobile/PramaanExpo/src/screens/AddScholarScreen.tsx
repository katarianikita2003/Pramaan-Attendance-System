// src/screens/AddScholarScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  HelperText,
  Chip,
  Surface,
  Text,
  IconButton,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import biometricService from '../services/biometric.service';
import zkpService from '../services/zkp.service';

interface ScholarData {
  name: string;
  email: string;
  phone: string;
  scholarId: string;
  department: string;
  course: string;
  year: string;
  password: string;
}

export default function AddScholarScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [biometricCaptured, setBiometricCaptured] = useState({
    face: false,
    fingerprint: false,
  });
  
  const [scholarData, setScholarData] = useState<ScholarData>({
    name: '',
    email: '',
    phone: '',
    scholarId: '',
    department: '',
    course: '',
    year: '',
    password: '',
  });

  const [biometricData, setBiometricData] = useState({
    faceData: null,
    fingerprintData: null,
    faceCommitment: null,
    fingerprintCommitment: null,
  });

  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const newErrors: any = {};
    
    if (!scholarData.name) newErrors.name = 'Name is required';
    if (!scholarData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(scholarData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!scholarData.phone) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(scholarData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    if (!scholarData.scholarId) newErrors.scholarId = 'Scholar ID is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: any = {};
    
    if (!scholarData.department) newErrors.department = 'Department is required';
    if (!scholarData.course) newErrors.course = 'Course is required';
    if (!scholarData.year) newErrors.year = 'Year is required';
    if (!scholarData.password) newErrors.password = 'Password is required';
    else if (scholarData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const captureFaceBiometric = async () => {
    setLoading(true);
    try {
      // Check if face is already registered globally
      const faceData = await biometricService.captureFaceData();
      
      if (!faceData) {
        Alert.alert('Error', 'Failed to capture face data');
        return;
      }

      // Check uniqueness across all organizations
      const isUnique = await zkpService.checkBiometricUniqueness({
        type: 'face',
        data: faceData.hash,
        timestamp: Date.now(),
      });

      if (!isUnique) {
        Alert.alert(
          'Face Already Registered',
          'This face is already registered in the system. Each person can only have one account.'
        );
        return;
      }

      // Generate ZKP commitment
      const commitment = await zkpService.generateCommitment({
        type: 'face',
        data: faceData.hash,
        timestamp: Date.now(),
      });

      setBiometricData({
        ...biometricData,
        faceData: faceData,
        faceCommitment: commitment,
      });
      
      setBiometricCaptured({ ...biometricCaptured, face: true });
      Alert.alert('Success', 'Face biometric captured successfully');
    } catch (error) {
      console.error('Face capture error:', error);
      Alert.alert('Error', 'Failed to capture face biometric');
    } finally {
      setLoading(false);
    }
  };

  const captureFingerprintBiometric = async () => {
    setLoading(true);
    try {
      const fingerprintData = await biometricService.captureFingerprintData();
      
      if (!fingerprintData) {
        Alert.alert('Error', 'Failed to capture fingerprint');
        return;
      }

      // Check uniqueness
      const isUnique = await zkpService.checkBiometricUniqueness({
        type: 'fingerprint',
        data: fingerprintData,
        timestamp: Date.now(),
      });

      if (!isUnique) {
        Alert.alert(
          'Fingerprint Already Registered',
          'This fingerprint is already registered in the system.'
        );
        return;
      }

      // Generate ZKP commitment
      const commitment = await zkpService.generateCommitment({
        type: 'fingerprint',
        data: fingerprintData,
        timestamp: Date.now(),
      });

      setBiometricData({
        ...biometricData,
        fingerprintData: fingerprintData,
        fingerprintCommitment: commitment,
      });
      
      setBiometricCaptured({ ...biometricCaptured, fingerprint: true });
      Alert.alert('Success', 'Fingerprint captured successfully');
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      Alert.alert('Error', 'Failed to capture fingerprint');
    } finally {
      setLoading(false);
    }
  };

  const handleAddScholar = async () => {
    if (!biometricCaptured.face && !biometricCaptured.fingerprint) {
      Alert.alert('Error', 'Please capture at least one biometric');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const requestData = {
        personalInfo: {
          name: scholarData.name,
          email: scholarData.email,
          phone: scholarData.phone,
        },
        academicInfo: {
          scholarId: scholarData.scholarId,
          department: scholarData.department,
          course: scholarData.course,
          year: scholarData.year,
        },
        credentials: {
          password: scholarData.password,
        },
        biometrics: {
          faceCommitment: biometricData.faceCommitment,
          fingerprintCommitment: biometricData.fingerprintCommitment,
        },
      };

      const response = await api.post('/admin/add-scholar', requestData, { headers });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Scholar added successfully!',
          [
            {
              text: 'Add Another',
              onPress: () => {
                // Reset form
                setScholarData({
                  name: '',
                  email: '',
                  phone: '',
                  scholarId: '',
                  department: '',
                  course: '',
                  year: '',
                  password: '',
                });
                setBiometricCaptured({ face: false, fingerprint: false });
                setBiometricData({
                  faceData: null,
                  fingerprintData: null,
                  faceCommitment: null,
                  fingerprintCommitment: null,
                });
                setCurrentStep(1);
              },
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Add scholar error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add scholar'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.stepTitle}>Personal Information</Title>
        
        <TextInput
          label="Full Name"
          value={scholarData.name}
          onChangeText={(text) => setScholarData({ ...scholarData, name: text })}
          mode="outlined"
          style={styles.input}
          error={!!errors.name}
        />
        {errors.name && <HelperText type="error">{errors.name}</HelperText>}

        <TextInput
          label="Email"
          value={scholarData.email}
          onChangeText={(text) => setScholarData({ ...scholarData, email: text })}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          error={!!errors.email}
        />
        {errors.email && <HelperText type="error">{errors.email}</HelperText>}

        <TextInput
          label="Phone Number"
          value={scholarData.phone}
          onChangeText={(text) => setScholarData({ ...scholarData, phone: text })}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
          error={!!errors.phone}
        />
        {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}

        <TextInput
          label="Scholar ID"
          value={scholarData.scholarId}
          onChangeText={(text) => setScholarData({ ...scholarData, scholarId: text })}
          mode="outlined"
          autoCapitalize="characters"
          style={styles.input}
          error={!!errors.scholarId}
        />
        {errors.scholarId && <HelperText type="error">{errors.scholarId}</HelperText>}

        <Button
          mode="contained"
          onPress={() => validateStep1() && setCurrentStep(2)}
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
        <Title style={styles.stepTitle}>Academic Information</Title>
        
        <TextInput
          label="Department"
          value={scholarData.department}
          onChangeText={(text) => setScholarData({ ...scholarData, department: text })}
          mode="outlined"
          style={styles.input}
          error={!!errors.department}
        />
        {errors.department && <HelperText type="error">{errors.department}</HelperText>}

        <TextInput
          label="Course"
          value={scholarData.course}
          onChangeText={(text) => setScholarData({ ...scholarData, course: text })}
          mode="outlined"
          style={styles.input}
          error={!!errors.course}
        />
        {errors.course && <HelperText type="error">{errors.course}</HelperText>}

        <TextInput
          label="Year"
          value={scholarData.year}
          onChangeText={(text) => setScholarData({ ...scholarData, year: text })}
          mode="outlined"
          style={styles.input}
          error={!!errors.year}
        />
        {errors.year && <HelperText type="error">{errors.year}</HelperText>}

        <TextInput
          label="Password"
          value={scholarData.password}
          onChangeText={(text) => setScholarData({ ...scholarData, password: text })}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          error={!!errors.password}
        />
        {errors.password && <HelperText type="error">{errors.password}</HelperText>}

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setCurrentStep(1)}
            style={[styles.button, styles.halfButton]}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={() => validateStep2() && setCurrentStep(3)}
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
        <Title style={styles.stepTitle}>Biometric Registration</Title>
        <Text style={styles.biometricInfo}>
          Capture at least one biometric for the scholar. The biometric data will be converted to a zero-knowledge proof commitment.
        </Text>

        <Surface style={styles.biometricCard}>
          <View style={styles.biometricHeader}>
            <Text style={styles.biometricTitle}>Face Recognition</Text>
            {biometricCaptured.face && (
              <Chip icon="check" textStyle={{ color: 'white' }} style={styles.successChip}>
                Captured
              </Chip>
            )}
          </View>
          <Text style={styles.biometricDesc}>
            Use the device camera to capture facial features
          </Text>
          <Button
            mode="contained"
            icon="camera"
            onPress={captureFaceBiometric}
            loading={loading}
            disabled={loading || biometricCaptured.face}
            style={styles.biometricButton}
          >
            Capture Face
          </Button>
        </Surface>

        <Surface style={styles.biometricCard}>
          <View style={styles.biometricHeader}>
            <Text style={styles.biometricTitle}>Fingerprint</Text>
            {biometricCaptured.fingerprint && (
              <Chip icon="check" textStyle={{ color: 'white' }} style={styles.successChip}>
                Captured
              </Chip>
            )}
          </View>
          <Text style={styles.biometricDesc}>
            Use the device sensor to capture fingerprint
          </Text>
          <Button
            mode="contained"
            icon="fingerprint"
            onPress={captureFingerprintBiometric}
            loading={loading}
            disabled={loading || biometricCaptured.fingerprint}
            style={styles.biometricButton}
          >
            Capture Fingerprint
          </Button>
        </Surface>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setCurrentStep(2)}
            style={[styles.button, styles.halfButton]}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={handleAddScholar}
            loading={loading}
            disabled={loading || (!biometricCaptured.face && !biometricCaptured.fingerprint)}
            style={[styles.button, styles.halfButton]}
          >
            Add Scholar
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface style={styles.progressContainer}>
            <View style={styles.progressSteps}>
              <View style={[styles.step, currentStep >= 1 && styles.activeStep]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 2 && styles.activeStepLine]} />
              <View style={[styles.step, currentStep >= 2 && styles.activeStep]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 3 && styles.activeStepLine]} />
              <View style={[styles.step, currentStep >= 3 && styles.activeStep]}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
            </View>
            <ProgressBar
              progress={currentStep / 3}
              color="#6C63FF"
              style={styles.progressBar}
            />
          </Surface>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  progressContainer: {
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#6C63FF',
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  activeStepLine: {
    backgroundColor: '#6C63FF',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  card: {
    elevation: 2,
  },
  stepTitle: {
    marginBottom: 20,
    fontSize: 20,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  halfButton: {
    flex: 1,
  },
  biometricInfo: {
    marginBottom: 20,
    color: '#666',
    lineHeight: 20,
  },
  biometricCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 1,
  },
  biometricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  biometricDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  biometricButton: {
    backgroundColor: '#6C63FF',
  },
  successChip: {
    backgroundColor: '#27AE60',
  },
});