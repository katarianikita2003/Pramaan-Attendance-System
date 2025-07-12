// mobile/PramaanExpo/src/screens/AddScholarScreen.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  RadioButton,
  Divider,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { adminService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import biometricService from '../services/biometricService';
import zkpService from '../services/zkpService';

const AddScholarScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Personal Info
    scholarId: '',
    name: '',
    email: '',
    phone: '',
    dateOfBirth: new Date(2000, 0, 1).toLocaleDateString('en-GB'),
    gender: 'male',
    
    // Academic Info
    department: '',
    course: '',
    year: new Date().getFullYear(),
    section: '',
    rollNumber: '',
    
    // Biometric Data
    fingerprints: [],
    faceData: null,
    
    // Guardian Info
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianRelation: 'parent',
    
    // Password
    password: '',
  });

  const steps = ['Personal Info', 'Academic Info', 'Biometric Data', 'Guardian Info'];

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0: // Personal Info
        if (!formData.scholarId || !formData.name || !formData.email || !formData.phone) {
          Alert.alert('Error', 'Please fill all required fields');
          return false;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          Alert.alert('Error', 'Please enter a valid email address');
          return false;
        }
        // Phone validation (10 digits)
        if (formData.phone.length !== 10 || !/^\d+$/.test(formData.phone)) {
          Alert.alert('Error', 'Please enter a valid 10-digit phone number');
          return false;
        }
        break;
      case 1: // Academic Info
        if (!formData.department || !formData.course || !formData.rollNumber) {
          Alert.alert('Error', 'Please fill all required fields');
          return false;
        }
        break;
      case 2: // Biometric Data
        if (formData.fingerprints.length === 0) {
          Alert.alert('Error', 'Please capture at least one fingerprint');
          return false;
        }
        break;
      case 3: // Guardian Info
        if (!formData.guardianName || !formData.guardianPhone) {
          Alert.alert('Error', 'Please fill guardian details');
          return false;
        }
        if (formData.guardianPhone.length !== 10 || !/^\d+$/.test(formData.guardianPhone)) {
          Alert.alert('Error', 'Please enter a valid 10-digit guardian phone number');
          return false;
        }
        break;
    }
    return true;
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    Alert.alert('Password Generated', `Password: ${password}\n\nPlease save this password securely.`);
  };

  const captureFingerprint = async () => {
    try {
      setLoading(true);
      const result = await biometricService.captureFingerprint();
      
      if (result.success) {
        setFormData({
          ...formData,
          fingerprints: [...formData.fingerprints, result.data.id],
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

  const removeFingerprint = (index) => {
    const newFingerprints = formData.fingerprints.filter((_, i) => i !== index);
    setFormData({ ...formData, fingerprints: newFingerprints });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, dateOfBirth: selectedDate.toLocaleDateString('en-GB') });
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    // Generate password if not already generated
    if (!formData.password) {
      generatePassword();
      return;
    }

    try {
      setLoading(true);
      
      console.log('Preparing scholar data with biometrics...');
      
      // Create the scholar data WITHOUT biometricData field
      const scholarData = {
        // Personal Info
        personalInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
        },
        // Academic Info
        academicInfo: {
          department: formData.department,
          course: formData.course,
          year: parseInt(formData.year),
          section: formData.section,
          rollNumber: formData.rollNumber,
        },
        // Guardian Info
        guardianInfo: {
          name: formData.guardianName,
          phone: formData.guardianPhone,
          email: formData.guardianEmail || '',
          relation: formData.guardianRelation,
        },
        // Additional fields
        scholarId: formData.scholarId,
        password: formData.password,
        organizationId: userData?.organizationId || userData?.user?.organizationId,
      };

      // Only add biometrics if we have ZKP service and fingerprint data
      if (formData.fingerprints && formData.fingerprints.length > 0) {
        try {
          const fingerprintCommitment = await zkpService.generateFingerprintCommitment(
            formData.fingerprints[0]
          );
          
          // Add biometrics field with proper structure
          scholarData.biometrics = {
            fingerprintCommitment: fingerprintCommitment,
            registeredAt: new Date().toISOString()
          };
          
          console.log('Generated ZKP commitment for fingerprint');
        } catch (zkpError) {
          console.error('ZKP generation error:', zkpError);
          // Continue without biometrics if ZKP fails
        }
      }

      console.log('Sending scholar data:', {
        ...scholarData,
        password: '[HIDDEN]',
        biometrics: scholarData.biometrics ? '[ZKP COMMITMENTS]' : undefined
      });
      
      const result = await adminService.addScholar(scholarData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Scholar registered successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error adding scholar:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add scholar'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderAcademicInfo();
      case 2:
        return renderBiometricData();
      case 3:
        return renderGuardianInfo();
      default:
        return null;
    }
  };

  const renderPersonalInfo = () => (
    <Card style={styles.card}>
      <Card.Content>
        <TextInput
          label="Scholar ID *"
          value={formData.scholarId}
          onChangeText={(text) => setFormData({ ...formData, scholarId: text })}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Full Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Email *"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          label="Phone Number *"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={10}
        />
        
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <TextInput
            label="Date of Birth"
            value={formData.dateOfBirth}
            mode="outlined"
            style={styles.input}
            editable={false}
            right={<TextInput.Icon icon="calendar" />}
          />
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
        
        <Text style={styles.label}>Gender</Text>
        <RadioButton.Group
          onValueChange={(value) => setFormData({ ...formData, gender: value })}
          value={formData.gender}
        >
          <View style={styles.radioRow}>
            <RadioButton.Item label="Male" value="male" />
            <RadioButton.Item label="Female" value="female" />
            <RadioButton.Item label="Other" value="other" />
          </View>
        </RadioButton.Group>
      </Card.Content>
    </Card>
  );

  const renderAcademicInfo = () => (
    <Card style={styles.card}>
      <Card.Content>
        <TextInput
          label="Department *"
          value={formData.department}
          onChangeText={(text) => setFormData({ ...formData, department: text })}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Course *"
          value={formData.course}
          onChangeText={(text) => setFormData({ ...formData, course: text })}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Year *"
          value={formData.year.toString()}
          onChangeText={(text) => setFormData({ ...formData, year: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
        />
        
        <TextInput
          label="Section"
          value={formData.section}
          onChangeText={(text) => setFormData({ ...formData, section: text })}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Roll Number *"
          value={formData.rollNumber}
          onChangeText={(text) => setFormData({ ...formData, rollNumber: text })}
          mode="outlined"
          style={styles.input}
        />
      </Card.Content>
    </Card>
  );

  const renderBiometricData = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.sectionTitle}>Fingerprint Enrollment</Text>
        <Text style={styles.subtitle}>Capture fingerprint data for secure attendance</Text>
        
        <TouchableOpacity 
          style={styles.biometricButton}
          onPress={captureFingerprint}
          disabled={loading}
        >
          <Icon name="fingerprint" size={60} color="#6200ee" />
          <Text style={styles.biometricButtonText}>
            {loading ? 'Capturing...' : 'Tap to Capture Fingerprint'}
          </Text>
        </TouchableOpacity>
        
        {formData.fingerprints.length > 0 && (
          <View style={styles.capturedList}>
            <Text style={styles.capturedTitle}>Captured Fingerprints:</Text>
            {formData.fingerprints.map((fp, index) => (
              <View key={fp} style={styles.capturedItem}>
                <Chip
                  icon="check-circle"
                  onClose={() => removeFingerprint(index)}
                  style={styles.chip}
                >
                  Fingerprint {index + 1}
                </Chip>
              </View>
            ))}
          </View>
        )}
        
        <Divider style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Face Recognition (Optional)</Text>
        <Text style={styles.subtitle}>Capture face data for additional security</Text>
        
        <TouchableOpacity style={styles.biometricButton} disabled>
          <Icon name="face" size={60} color="#ccc" />
          <Text style={[styles.biometricButtonText, { color: '#ccc' }]}>
            Coming Soon
          </Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  const renderGuardianInfo = () => (
    <Card style={styles.card}>
      <Card.Content>
        <TextInput
          label="Guardian Name *"
          value={formData.guardianName}
          onChangeText={(text) => setFormData({ ...formData, guardianName: text })}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="Guardian Phone *"
          value={formData.guardianPhone}
          onChangeText={(text) => setFormData({ ...formData, guardianPhone: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={10}
        />
        
        <TextInput
          label="Guardian Email (Optional)"
          value={formData.guardianEmail}
          onChangeText={(text) => setFormData({ ...formData, guardianEmail: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>Relation</Text>
        <RadioButton.Group
          onValueChange={(value) => setFormData({ ...formData, guardianRelation: value })}
          value={formData.guardianRelation}
        >
          <View style={styles.radioRow}>
            <RadioButton.Item label="Parent" value="parent" />
            <RadioButton.Item label="Guardian" value="guardian" />
            <RadioButton.Item label="Other" value="other" />
          </View>
        </RadioButton.Group>
        
        {!formData.password && (
          <Button
            mode="outlined"
            onPress={generatePassword}
            style={styles.passwordButton}
            icon="key"
          >
            Generate Password
          </Button>
        )}
        
        {formData.password && (
          <Card style={styles.passwordCard}>
            <Card.Content>
              <Text style={styles.passwordLabel}>Generated Password:</Text>
              <Text style={styles.passwordText}>{formData.password}</Text>
              <Text style={styles.passwordNote}>
                Please save this password securely and share it with the scholar
              </Text>
            </Card.Content>
          </Card>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ProgressBar
            progress={(currentStep + 1) / steps.length}
            color="#6200ee"
            style={styles.progressBar}
          />
          
          <View style={styles.stepIndicator}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    index === currentStep && styles.activeStepCircle,
                    index < currentStep && styles.completedStepCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      (index === currentStep || index < currentStep) && styles.activeStepNumber,
                    ]}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, index === currentStep && styles.activeStepLabel]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
          
          {renderStepContent()}
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          {currentStep > 0 && (
            <Button
              mode="outlined"
              onPress={handlePrevious}
              style={styles.button}
            >
              Previous
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.button, currentStep === 0 && styles.fullWidth]}
            >
              Next
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.button, styles.submitButton]}
              loading={loading}
              disabled={loading || !formData.password}
            >
              Register Scholar
            </Button>
          )}
        </View>
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
    paddingBottom: 100,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  activeStepCircle: {
    backgroundColor: '#6200ee',
  },
  completedStepCircle: {
    backgroundColor: '#4caf50',
  },
  stepNumber: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeStepNumber: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activeStepLabel: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  biometricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#6200ee',
    borderRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  biometricButtonText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6200ee',
  },
  capturedList: {
    marginTop: 16,
  },
  capturedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  capturedItem: {
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#e8f5e9',
  },
  divider: {
    marginVertical: 20,
  },
  passwordButton: {
    marginTop: 16,
  },
  passwordCard: {
    marginTop: 16,
    backgroundColor: '#e3f2fd',
  },
  passwordLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  passwordText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  passwordNote: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullWidth: {
    marginHorizontal: 0,
  },
  submitButton: {
    backgroundColor: '#4caf50',
  },
});

export default AddScholarScreen;