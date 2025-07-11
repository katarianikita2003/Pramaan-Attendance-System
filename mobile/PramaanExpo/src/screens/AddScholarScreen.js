// mobile/PramaanExpo/src/screens/AddScholarScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  RadioButton,
  HelperText,
  Divider,
  ProgressBar,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';

const AddScholarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
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
    profileImage: null,
  });

  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!scholarData.scholarId) newErrors.scholarId = 'Scholar ID is required';
    if (!scholarData.name) newErrors.name = 'Name is required';
    if (!scholarData.email) newErrors.email = 'Email is required';
    if (!scholarData.phone) newErrors.phone = 'Phone is required';
    if (!scholarData.password) newErrors.password = 'Password is required';
    
    if (scholarData.password && scholarData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (scholarData.password !== scholarData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (scholarData.email && !emailRegex.test(scholarData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!scholarData.department) newErrors.department = 'Department is required';
    if (!scholarData.course) newErrors.course = 'Course is required';
    if (!scholarData.year) newErrors.year = 'Year is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permissions are required to select a profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setScholarData({
          ...scholarData,
          profileImage: result.assets[0]
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const response = await adminService.addScholar({
        personalInfo: {
          scholarId: scholarData.scholarId,
          name: scholarData.name,
          email: scholarData.email,
          phone: scholarData.phone,
          profileImage: scholarData.profileImage?.uri,
        },
        academicInfo: {
          department: scholarData.department,
          course: scholarData.course,
          year: scholarData.year,
          section: scholarData.section,
        },
        password: scholarData.password,
        organizationId: user?.organizationId,
      });

      if (response.success) {
        Alert.alert(
          'Success',
          'Scholar has been registered successfully!',
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
      Alert.alert('Error', 'Failed to register scholar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Personal Information</Text>
      
      <TextInput
        label="Scholar ID *"
        value={scholarData.scholarId}
        onChangeText={(text) => setScholarData({ ...scholarData, scholarId: text })}
        mode="outlined"
        style={styles.input}
        autoCapitalize="characters"
        error={!!errors.scholarId}
      />
      <HelperText type="error" visible={!!errors.scholarId}>
        {errors.scholarId}
      </HelperText>

      <TextInput
        label="Full Name *"
        value={scholarData.name}
        onChangeText={(text) => setScholarData({ ...scholarData, name: text })}
        mode="outlined"
        style={styles.input}
        error={!!errors.name}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name}
      </HelperText>

      <TextInput
        label="Email *"
        value={scholarData.email}
        onChangeText={(text) => setScholarData({ ...scholarData, email: text })}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        error={!!errors.email}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>

      <TextInput
        label="Phone Number *"
        value={scholarData.phone}
        onChangeText={(text) => setScholarData({ ...scholarData, phone: text })}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        error={!!errors.phone}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <TextInput
        label="Password *"
        value={scholarData.password}
        onChangeText={(text) => setScholarData({ ...scholarData, password: text })}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        error={!!errors.password}
      />
      <HelperText type="error" visible={!!errors.password}>
        {errors.password}
      </HelperText>

      <TextInput
        label="Confirm Password *"
        value={scholarData.confirmPassword}
        onChangeText={(text) => setScholarData({ ...scholarData, confirmPassword: text })}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        error={!!errors.confirmPassword}
      />
      <HelperText type="error" visible={!!errors.confirmPassword}>
        {errors.confirmPassword}
      </HelperText>

      <TouchableOpacity onPress={pickProfileImage} style={styles.photoButton}>
        {scholarData.profileImage ? (
          <Avatar.Image 
            size={80} 
            source={{ uri: scholarData.profileImage.uri }}
            style={styles.profileImage}
          />
        ) : (
          <Avatar.Icon 
            size={80} 
            icon="camera" 
            style={styles.photoPlaceholder}
          />
        )}
        <Text style={styles.photoButtonText}>
          {scholarData.profileImage ? 'Change Photo' : 'Add Profile Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Academic Information</Text>
      
      <TextInput
        label="Department *"
        value={scholarData.department}
        onChangeText={(text) => setScholarData({ ...scholarData, department: text })}
        mode="outlined"
        style={styles.input}
        error={!!errors.department}
      />
      <HelperText type="error" visible={!!errors.department}>
        {errors.department}
      </HelperText>

      <TextInput
        label="Course *"
        value={scholarData.course}
        onChangeText={(text) => setScholarData({ ...scholarData, course: text })}
        mode="outlined"
        style={styles.input}
        error={!!errors.course}
      />
      <HelperText type="error" visible={!!errors.course}>
        {errors.course}
      </HelperText>

      <TextInput
        label="Year *"
        value={scholarData.year}
        onChangeText={(text) => setScholarData({ ...scholarData, year: text })}
        mode="outlined"
        style={styles.input}
        error={!!errors.year}
      />
      <HelperText type="error" visible={!!errors.year}>
        {errors.year}
      </HelperText>

      <TextInput
        label="Section"
        value={scholarData.section}
        onChangeText={(text) => setScholarData({ ...scholarData, section: text })}
        mode="outlined"
        style={styles.input}
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Review & Submit</Text>
      
      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewTitle}>Personal Information</Text>
          <Text>Scholar ID: {scholarData.scholarId}</Text>
          <Text>Name: {scholarData.name}</Text>
          <Text>Email: {scholarData.email}</Text>
          <Text>Phone: {scholarData.phone}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewTitle}>Academic Information</Text>
          <Text>Department: {scholarData.department}</Text>
          <Text>Course: {scholarData.course}</Text>
          <Text>Year: {scholarData.year}</Text>
          <Text>Section: {scholarData.section || 'Not specified'}</Text>
        </Card.Content>
      </Card>

      <Text style={styles.noteText}>
        Note: The scholar will receive login credentials via email.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Avatar.Icon size={40} icon="arrow-left" style={styles.backButton} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Scholar</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar progress={step / 3} color="#6C63FF" style={styles.progressBar} />
          <Text style={styles.stepIndicator}>Step {step} of 3</Text>
        </View>

        <ScrollView style={styles.content}>
          <Card style={styles.formCard}>
            <Card.Content>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {step > 1 && (
            <Button
              mode="outlined"
              onPress={handlePrevious}
              style={styles.navButton}
              disabled={loading}
            >
              Previous
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.navButton, { flex: step === 1 ? 1 : 0.5 }]}
            >
              Next
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.navButton, { flex: 0.5 }]}
              loading={loading}
              disabled={loading}
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
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  backButton: {
    backgroundColor: '#6C63FF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 4,
    marginBottom: 8,
  },
  stepIndicator: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    elevation: 2,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
  },
  photoButton: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    marginBottom: 8,
  },
  photoPlaceholder: {
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
  },
  reviewCard: {
    marginBottom: 16,
    elevation: 1,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2C3E50',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  navButton: {
    marginHorizontal: 4,
  },
});

export default AddScholarScreen;