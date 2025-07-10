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
import biometricService from '../services/biometric.service';

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
    const { available, biometryType } = await biometricService.checkBiometricAvailability();
    if (available) {
      setBiometricTypes(biometryType);
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
        mediaTypes: ImagePicker.MediaType.Images,
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
      Alert.alert('Error', 'Failed to capture face');
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
    // Validate biometric data
    if (biometricData.selectedBiometric === 'face' && !biometricData.faceImage) {
      Alert.alert('Error', 'Please capture face photo');
      return;
    }
    
    if (biometricData.selectedBiometric === 'fingerprint' && !biometricData.fingerprintData) {
      Alert.alert('Error', 'Please capture fingerprint');
      return;
    }
    
    if (biometricData.selectedBiometric === 'both' && 
        (!biometricData.faceImage || !biometricData.fingerprintData)) {
      Alert.alert('Error', 'Please capture both face and fingerprint');
      return;
    }

    try {
      setLoading(true);

      const formData = {
        scholarId: scholarData.scholarId.toUpperCase(),
        personalInfo: {
          name: scholarData.name,
          email: scholarData.email,
          phone: scholarData.phone,
        },
        academicInfo: {
          department: scholarData.department,
          course: scholarData.course,
          year: scholarData.year,
          section: scholarData.section || '',
        },
        password: scholarData.password,
        biometrics: {
          faceCommitment: biometricData.faceCommitment,
          fingerprintCommitment: biometricData.fingerprintCommitment,
        },
        organizationId: user.organizationId,
      };

      const response = await adminService.addScholar(formData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Scholar added successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add scholar'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Personal Information</Text>
      
      <View style={styles.profilePhotoContainer}>
        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Avatar.Image size={100} source={{ uri: profilePhoto }} />
          ) : (
            <Avatar.Icon size={100} icon="camera" style={styles.avatarPlaceholder} />
          )}
        </TouchableOpacity>
        <Text style={styles.photoHelp}>Tap to add profile photo (optional)</Text>
      </View>

      <TextInput
        label="Scholar ID *"
        value={scholarData.scholarId}
        onChangeText={(text) => setScholarData({...scholarData, scholarId: text})}
        style={styles.input}
        mode="outlined"
        autoCapitalize="characters"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Full Name *"
        value={scholarData.name}
        onChangeText={(text) => setScholarData({...scholarData, name: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Email *"
        value={scholarData.email}
        onChangeText={(text) => setScholarData({...scholarData, email: text})}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Phone Number *"
        value={scholarData.phone}
        onChangeText={(text) => setScholarData({...scholarData, phone: text})}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Password *"
        value={scholarData.password}
        onChangeText={(text) => setScholarData({...scholarData, password: text})}
        style={styles.input}
        mode="outlined"
        secureTextEntry
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="info" visible={true}>
        Minimum 8 characters
      </HelperText>

      <TextInput
        label="Confirm Password *"
        value={scholarData.confirmPassword}
        onChangeText={(text) => setScholarData({...scholarData, confirmPassword: text})}
        style={styles.input}
        mode="outlined"
        secureTextEntry
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Academic Information</Text>

      <TextInput
        label="Department *"
        value={scholarData.department}
        onChangeText={(text) => setScholarData({...scholarData, department: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Course/Program *"
        value={scholarData.course}
        onChangeText={(text) => setScholarData({...scholarData, course: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Year *"
        value={scholarData.year}
        onChangeText={(text) => setScholarData({...scholarData, year: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Section (Optional)"
        value={scholarData.section}
        onChangeText={(text) => setScholarData({...scholarData, section: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Biometric Registration</Text>
      
      <View style={styles.biometricSelection}>
        <Text style={styles.sectionLabel}>Select Biometric Type:</Text>
        <RadioButton.Group
          onValueChange={value => setBiometricData({...biometricData, selectedBiometric: value})}
          value={biometricData.selectedBiometric}
        >
          <RadioButton.Item label="Both (Face + Fingerprint)" value="both" />
          <RadioButton.Item label="Face Only" value="face" />
          <RadioButton.Item label="Fingerprint Only" value="fingerprint" />
        </RadioButton.Group>
      </View>

      <Divider style={styles.divider} />

      {/* Face Capture */}
      {(biometricData.selectedBiometric === 'face' || biometricData.selectedBiometric === 'both') && (
        <Card style={styles.biometricCard}>
          <Card.Content>
            <View style={styles.biometricHeader}>
              <Icon name="face" size={24} color="#6C63FF" />
              <Text style={styles.biometricTitle}>Face Recognition</Text>
            </View>
            
            {biometricData.faceImage ? (
              <View style={styles.capturedImageContainer}>
                <Image source={{ uri: biometricData.faceImage }} style={styles.capturedImage} />
                <IconButton
                  icon="close-circle"
                  size={24}
                  onPress={() => setBiometricData({...biometricData, faceImage: null, faceCommitment: null})}
                  style={styles.removeButton}
                />
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="camera"
                onPress={captureFace}
                loading={loading}
                disabled={loading}
                style={styles.captureButton}
              >
                Capture Face
              </Button>
            )}
            
            {biometricData.faceCommitment && (
              <Chip icon="check" style={styles.successChip}>
                Face data encrypted
              </Chip>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Fingerprint Capture */}
      {(biometricData.selectedBiometric === 'fingerprint' || biometricData.selectedBiometric === 'both') && (
        <Card style={styles.biometricCard}>
          <Card.Content>
            <View style={styles.biometricHeader}>
              <Icon name="fingerprint" size={24} color="#6C63FF" />
              <Text style={styles.biometricTitle}>Fingerprint</Text>
            </View>
            
            {biometricData.fingerprintData ? (
              <View style={styles.fingerprintSuccess}>
                <Icon name="check-circle" size={48} color="#4CAF50" />
                <Text style={styles.successText}>Fingerprint captured</Text>
                <IconButton
                  icon="refresh"
                  size={24}
                  onPress={() => setBiometricData({...biometricData, fingerprintData: null, fingerprintCommitment: null})}
                />
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="fingerprint"
                onPress={captureFingerprint}
                loading={loading}
                disabled={loading}
                style={styles.captureButton}
              >
                Capture Fingerprint
              </Button>
            )}
            
            {biometricData.fingerprintCommitment && (
              <Chip icon="check" style={styles.successChip}>
                Fingerprint data encrypted
              </Chip>
            )}
          </Card.Content>
        </Card>
      )}

      <HelperText type="info" visible={true} style={styles.privacyNote}>
        <Icon name="lock" size={14} /> Your biometric data is encrypted using Zero-Knowledge Proof technology. 
        The actual biometric data never leaves your device.
      </HelperText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>Add New Scholar</Text>
          <View style={{ width: 48 }} />
        </View>

        <ProgressBar
          progress={step / 3}
          color="#6C63FF"
          style={styles.progressBar}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card}>
            <Card.Content>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </Card.Content>
          </Card>

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
                style={[styles.button, styles.nextButton]}
                disabled={loading}
              >
                Next
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={[styles.button, styles.nextButton]}
                loading={loading}
                disabled={loading}
              >
                Add Scholar
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 4,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E0E0',
  },
  photoHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
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
  nextButton: {
    backgroundColor: '#6C63FF',
  },
  biometricSelection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  biometricCard: {
    marginBottom: 16,
    elevation: 2,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#333',
  },
  capturedImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginVertical: 16,
  },
  capturedImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: '30%',
    backgroundColor: '#fff',
  },
  captureButton: {
    borderColor: '#6C63FF',
    marginVertical: 8,
  },
  successChip: {
    backgroundColor: '#E8F5E9',
    marginTop: 12,
    alignSelf: 'center',
  },
  fingerprintSuccess: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 8,
  },
  privacyNote: {
    marginTop: 16,
    paddingHorizontal: 8,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default AddScholarScreen;