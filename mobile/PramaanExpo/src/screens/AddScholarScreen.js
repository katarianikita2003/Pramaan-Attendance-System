// src/screens/AddScholarScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Chip,
  RadioButton,
  Surface,
  IconButton,
  Card,
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';

const AddScholarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [addedScholar, setAddedScholar] = useState(null);

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
  });

  const [academicInfo, setAcademicInfo] = useState({
    scholarId: '',
    course: '',
    department: '',
    year: '',
    section: '',
    rollNumber: '',
  });

  const [biometricData, setBiometricData] = useState({
    fingerprints: [],
    faceData: null,
  });

  const [guardianInfo, setGuardianInfo] = useState({
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    relation: 'parent',
  });

  const steps = [
    { number: 1, title: 'Personal Info', icon: 'person' },
    { number: 2, title: 'Academic Info', icon: 'school' },
    { number: 3, title: 'Biometric Data', icon: 'fingerprint' },
    { number: 4, title: 'Guardian Info', icon: 'people' },
  ];

  const handleFingerprintCapture = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometric Not Available',
          'Please ensure your device has biometric authentication enabled.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Capture Fingerprint',
        'Place your finger on the biometric sensor to capture fingerprint data.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Capture',
            onPress: async () => {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Scan fingerprint for enrollment',
                fallbackLabel: 'Use Password',
              });

              if (result.success) {
                const fingerprintId = `FP_${Date.now()}`;
                setBiometricData(prev => ({
                  ...prev,
                  fingerprints: [...prev.fingerprints, fingerprintId],
                }));
                Alert.alert('Success', 'Fingerprint captured successfully');
              } else {
                Alert.alert('Failed', 'Fingerprint capture failed. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      Alert.alert('Error', 'Failed to capture fingerprint');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Generate a random password for the scholar
      const randomPassword = Math.random().toString(36).slice(-8) + 'A1!';
      
      const scholarData = {
        // Root level fields
        scholarId: academicInfo.scholarId,
        password: randomPassword, // Backend will hash this
        organizationId: user?.organizationId,
        
        // Nested fields
        personalInfo: {
          name: personalInfo.name,
          email: personalInfo.email,
          phone: personalInfo.phone,
          dateOfBirth: personalInfo.dateOfBirth,
          gender: personalInfo.gender,
        },
        academicInfo: {
          course: academicInfo.course,
          department: academicInfo.department || academicInfo.course, // Use course as department if not provided
          year: parseInt(academicInfo.year) || 1,
          section: academicInfo.section,
          rollNumber: academicInfo.rollNumber,
        },
        guardianInfo: {
          name: guardianInfo.guardianName,
          phone: guardianInfo.guardianPhone,
          email: guardianInfo.guardianEmail,
          relation: guardianInfo.relation,
        },
        biometricData: {
          fingerprints: biometricData.fingerprints,
          faceData: biometricData.faceData,
        },
      };

      console.log('Submitting scholar data:', scholarData);
      const response = await adminService.addScholar(scholarData);
      console.log('Scholar added successfully:', response);
      
      // Store the password to show to the user
      setAddedScholar({
        ...response.scholar,
        temporaryPassword: randomPassword
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error adding scholar:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add scholar. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!personalInfo.name || !personalInfo.email || !personalInfo.phone) {
          Alert.alert('Missing Information', 'Please fill all required fields');
          return false;
        }
        return true;
      case 2:
        if (!academicInfo.scholarId || !academicInfo.course) {
          Alert.alert('Missing Information', 'Please fill all required fields');
          return false;
        }
        return true;
      case 3:
        if (biometricData.fingerprints.length === 0) {
          Alert.alert('Missing Biometric', 'Please capture at least one fingerprint');
          return false;
        }
        return true;
      case 4:
        if (!guardianInfo.guardianName || !guardianInfo.guardianPhone) {
          Alert.alert('Missing Information', 'Please fill guardian details');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step.number} style={styles.stepWrapper}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step.number && styles.stepCircleActive,
            ]}
          >
            <MaterialIcons
              name={step.icon}
              size={20}
              color={currentStep >= step.number ? '#fff' : '#999'}
            />
          </View>
          <Text
            style={[
              styles.stepTitle,
              currentStep >= step.number && styles.stepTitleActive,
            ]}
          >
            {step.title}
          </Text>
          {index < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step.number && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.formSection}>
      <TextInput
        label="Full Name *"
        value={personalInfo.name}
        onChangeText={(text) => setPersonalInfo({ ...personalInfo, name: text })}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="account" />}
      />
      <TextInput
        label="Email *"
        value={personalInfo.email}
        onChangeText={(text) => setPersonalInfo({ ...personalInfo, email: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        left={<TextInput.Icon icon="email" />}
      />
      <TextInput
        label="Phone Number *"
        value={personalInfo.phone}
        onChangeText={(text) => setPersonalInfo({ ...personalInfo, phone: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="phone" />}
      />
      <TextInput
        label="Date of Birth"
        value={personalInfo.dateOfBirth}
        onChangeText={(text) => setPersonalInfo({ ...personalInfo, dateOfBirth: text })}
        style={styles.input}
        mode="outlined"
        placeholder="DD/MM/YYYY"
        left={<TextInput.Icon icon="calendar" />}
      />
      <View style={styles.radioGroup}>
        <Text style={styles.radioLabel}>Gender:</Text>
        <RadioButton.Group
          onValueChange={(value) => setPersonalInfo({ ...personalInfo, gender: value })}
          value={personalInfo.gender}
        >
          <View style={styles.radioRow}>
            <RadioButton.Item label="Male" value="male" />
            <RadioButton.Item label="Female" value="female" />
            <RadioButton.Item label="Other" value="other" />
          </View>
        </RadioButton.Group>
      </View>
    </View>
  );

  const renderAcademicInfo = () => (
    <View style={styles.formSection}>
      <TextInput
        label="Scholar ID *"
        value={academicInfo.scholarId}
        onChangeText={(text) => setAcademicInfo({ ...academicInfo, scholarId: text })}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="identifier" />}
      />
      <TextInput
        label="Course/Program *"
        value={academicInfo.course}
        onChangeText={(text) => setAcademicInfo({ ...academicInfo, course: text })}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="school" />}
      />
      <TextInput
        label="Department"
        value={academicInfo.department}
        onChangeText={(text) => setAcademicInfo({ ...academicInfo, department: text })}
        style={styles.input}
        mode="outlined"
        placeholder="Computer Science, Electronics, etc."
        left={<TextInput.Icon icon="domain" />}
      />
      <TextInput
        label="Year"
        value={academicInfo.year}
        onChangeText={(text) => setAcademicInfo({ ...academicInfo, year: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="numeric"
        left={<TextInput.Icon icon="calendar-today" />}
      />
      <TextInput
        label="Section"
        value={academicInfo.section}
        onChangeText={(text) => setAcademicInfo({ ...academicInfo, section: text })}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="alpha-s-box" />}
      />
      <TextInput
        label="Roll Number"
        value={academicInfo.rollNumber}
        onChangeText={(text) => setAcademicInfo({ ...academicInfo, rollNumber: text })}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="numeric" />}
      />
    </View>
  );

  const renderBiometricData = () => (
    <View style={styles.formSection}>
      <Card style={styles.biometricCard}>
        <Card.Content>
          <Text style={styles.biometricTitle}>Fingerprint Enrollment</Text>
          <Text style={styles.biometricSubtitle}>
            Capture fingerprint data for secure attendance
          </Text>
          
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleFingerprintCapture}
          >
            <MaterialCommunityIcons name="fingerprint" size={48} color="#6C63FF" />
            <Text style={styles.captureButtonText}>Tap to Capture Fingerprint</Text>
          </TouchableOpacity>

          {biometricData.fingerprints.length > 0 && (
            <View style={styles.capturedFingerprints}>
              <Text style={styles.capturedTitle}>Captured Fingerprints:</Text>
              {biometricData.fingerprints.map((fp, index) => (
                <Chip
                  key={fp}
                  style={styles.fingerprintChip}
                  icon="check-circle"
                  onClose={() => {
                    setBiometricData(prev => ({
                      ...prev,
                      fingerprints: prev.fingerprints.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  Fingerprint {index + 1}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={[styles.biometricCard, { marginTop: 16 }]}>
        <Card.Content>
          <Text style={styles.biometricTitle}>Face Recognition (Optional)</Text>
          <Text style={styles.biometricSubtitle}>
            Capture face data for additional security
          </Text>
          
          <TouchableOpacity
            style={[styles.captureButton, { opacity: 0.5 }]}
            disabled
          >
            <MaterialIcons name="face" size={48} color="#999" />
            <Text style={[styles.captureButtonText, { color: '#999' }]}>
              Coming Soon
            </Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    </View>
  );

  const renderGuardianInfo = () => (
    <View style={styles.formSection}>
      <TextInput
        label="Guardian Name *"
        value={guardianInfo.guardianName}
        onChangeText={(text) => setGuardianInfo({ ...guardianInfo, guardianName: text })}
        style={styles.input}
        mode="outlined"
        left={<TextInput.Icon icon="account-child" />}
      />
      <TextInput
        label="Guardian Phone *"
        value={guardianInfo.guardianPhone}
        onChangeText={(text) => setGuardianInfo({ ...guardianInfo, guardianPhone: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="phone" />}
      />
      <TextInput
        label="Guardian Email"
        value={guardianInfo.guardianEmail}
        onChangeText={(text) => setGuardianInfo({ ...guardianInfo, guardianEmail: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        left={<TextInput.Icon icon="email" />}
      />
      <View style={styles.radioGroup}>
        <Text style={styles.radioLabel}>Relation:</Text>
        <RadioButton.Group
          onValueChange={(value) => setGuardianInfo({ ...guardianInfo, relation: value })}
          value={guardianInfo.relation}
        >
          <View style={styles.radioRow}>
            <RadioButton.Item label="Parent" value="parent" />
            <RadioButton.Item label="Guardian" value="guardian" />
            <RadioButton.Item label="Other" value="other" />
          </View>
        </RadioButton.Group>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderAcademicInfo();
      case 3:
        return renderBiometricData();
      case 4:
        return renderGuardianInfo();
      default:
        return null;
    }
  };

  const SuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.modalTitle}>Scholar Added Successfully!</Text>
          <Text style={styles.modalSubtitle}>
            {addedScholar?.personalInfo?.name} has been registered
          </Text>
          <Text style={styles.modalScholarId}>
            Scholar ID: {addedScholar?.scholarId}
          </Text>
          {addedScholar?.temporaryPassword && (
            <View style={styles.passwordContainer}>
              <Text style={styles.passwordLabel}>Temporary Password:</Text>
              <Text style={styles.passwordText}>{addedScholar.temporaryPassword}</Text>
              <Text style={styles.passwordNote}>
                Please share this password with the scholar. They will be asked to change it on first login.
              </Text>
            </View>
          )}
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowSuccessModal(false);
                // Reset form
                setCurrentStep(1);
                setPersonalInfo({
                  name: '',
                  email: '',
                  phone: '',
                  dateOfBirth: '',
                  gender: 'male',
                });
                setAcademicInfo({
                  scholarId: '',
                  course: '',
                  department: '',
                  year: '',
                  section: '',
                  rollNumber: '',
                });
                setBiometricData({
                  fingerprints: [],
                  faceData: null,
                });
                setGuardianInfo({
                  guardianName: '',
                  guardianPhone: '',
                  guardianEmail: '',
                  relation: 'parent',
                });
              }}
              style={[styles.modalButton, { marginRight: 8 }]}
            >
              Add Another
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('ScholarsList');
              }}
              style={styles.modalButton}
            >
              View Scholars
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Scholar</Text>
          <View style={{ width: 24 }} />
        </View>

        {renderStepIndicator()}

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentStep()}
        </ScrollView>

        <Surface style={styles.footer} elevation={4}>
          <View style={styles.footerButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  navigation.goBack();
                }
              }}
              disabled={loading}
              style={styles.footerButton}
            >
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </Button>
            <Button
              mode="contained"
              onPress={handleNext}
              loading={loading}
              disabled={loading}
              style={styles.footerButton}
            >
              {currentStep === 4 ? 'Submit' : 'Next'}
            </Button>
          </View>
        </Surface>

        <SuccessModal />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#6C63FF',
  },
  stepTitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  stepTitleActive: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#6C63FF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formSection: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  biometricCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  captureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  captureButtonText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6C63FF',
  },
  capturedFingerprints: {
    marginTop: 16,
  },
  capturedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fingerprintChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalScholarId: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
  },
  passwordContainer: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  passwordLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  passwordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passwordNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AddScholarScreen;