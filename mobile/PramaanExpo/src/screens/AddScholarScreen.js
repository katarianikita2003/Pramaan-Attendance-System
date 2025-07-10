// mobile/PramaanExpo/src/screens/AddScholarScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  HelperText,
  RadioButton,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { adminService } from '../services/api';

const AddScholarScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [faceImage, setFaceImage] = useState(null);
  
  const [formData, setFormData] = useState({
    // Personal Info
    scholarId: '',
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    
    // Academic Info
    department: '',
    course: '',
    year: '',
    section: '',
    
    // Guardian Info
    guardianName: '',
    guardianPhone: '',
    
    // Address
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.scholarId) newErrors.scholarId = 'Scholar ID is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone) newErrors.phone = 'Phone is required';
    else if (formData.phone.length < 10) {
      newErrors.phone = 'Invalid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.course) newErrors.course = 'Course is required';
    if (!formData.year) newErrors.year = 'Year is required';
    
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
    setStep(step - 1);
  };

  const captureface = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to capture face.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFaceImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Face capture error:', error);
      Alert.alert('Error', 'Failed to capture face image');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!faceImage) {
        Alert.alert('Error', 'Please capture face image');
        return;
      }

      setLoading(true);

      const scholarData = {
        scholarId: formData.scholarId,
        personalInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: {
            street: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          },
        },
        academicInfo: {
          department: formData.department,
          course: formData.course,
          year: formData.year,
          section: formData.section,
        },
        guardianInfo: {
          name: formData.guardianName,
          phone: formData.guardianPhone,
        },
        biometricData: {
          faceImage: faceImage.base64,
        },
      };

      const response = await adminService.addScholar(scholarData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Scholar added successfully!',
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
      
      <TextInput
        label="Scholar ID *"
        value={formData.scholarId}
        onChangeText={(text) => setFormData({ ...formData, scholarId: text })}
        style={styles.input}
        mode="outlined"
        error={!!errors.scholarId}
      />
      <HelperText type="error" visible={!!errors.scholarId}>
        {errors.scholarId}
      </HelperText>

      <TextInput
        label="Full Name *"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        style={styles.input}
        mode="outlined"
        error={!!errors.name}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name}
      </HelperText>

      <TextInput
        label="Email *"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        error={!!errors.email}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>

      <TextInput
        label="Phone *"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
        error={!!errors.phone}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <View style={styles.radioContainer}>
        <Text style={styles.radioLabel}>Gender:</Text>
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
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Academic Information</Text>
      
      <TextInput
        label="Department *"
        value={formData.department}
        onChangeText={(text) => setFormData({ ...formData, department: text })}
        style={styles.input}
        mode="outlined"
        error={!!errors.department}
      />
      <HelperText type="error" visible={!!errors.department}>
        {errors.department}
      </HelperText>

      <TextInput
        label="Course *"
        value={formData.course}
        onChangeText={(text) => setFormData({ ...formData, course: text })}
        style={styles.input}
        mode="outlined"
        error={!!errors.course}
      />
      <HelperText type="error" visible={!!errors.course}>
        {errors.course}
      </HelperText>

      <TextInput
        label="Year *"
        value={formData.year}
        onChangeText={(text) => setFormData({ ...formData, year: text })}
        style={styles.input}
        mode="outlined"
        error={!!errors.year}
      />
      <HelperText type="error" visible={!!errors.year}>
        {errors.year}
      </HelperText>

      <TextInput
        label="Section"
        value={formData.section}
        onChangeText={(text) => setFormData({ ...formData, section: text })}
        style={styles.input}
        mode="outlined"
      />

      <Text style={styles.sectionTitle}>Guardian Information</Text>

      <TextInput
        label="Guardian Name"
        value={formData.guardianName}
        onChangeText={(text) => setFormData({ ...formData, guardianName: text })}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Guardian Phone"
        value={formData.guardianPhone}
        onChangeText={(text) => setFormData({ ...formData, guardianPhone: text })}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Biometric Enrollment</Text>
      
      <Card style={styles.biometricCard}>
        <Card.Content style={styles.biometricContent}>
          {faceImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: faceImage.uri }} style={styles.faceImage} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={captureface}
              >
                <Icon name="refresh" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={captureface} style={styles.captureArea}>
              <Icon name="photo-camera" size={64} color="#6C63FF" />
              <Text style={styles.captureText}>Tap to Capture Face</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>

      <View style={styles.addressSection}>
        <Text style={styles.sectionTitle}>Address</Text>
        
        <TextInput
          label="Street Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          style={styles.input}
          mode="outlined"
          multiline
        />

        <View style={styles.row}>
          <TextInput
            label="City"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            style={[styles.input, styles.halfInput]}
            mode="outlined"
          />
          
          <TextInput
            label="State"
            value={formData.state}
            onChangeText={(text) => setFormData({ ...formData, state: text })}
            style={[styles.input, styles.halfInput]}
            mode="outlined"
          />
        </View>

        <TextInput
          label="Pincode"
          value={formData.pincode}
          onChangeText={(text) => setFormData({ ...formData, pincode: text })}
          style={styles.input}
          mode="outlined"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Scholar</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((num) => (
          <View key={num} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                step >= num && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  step >= num && styles.stepNumberActive,
                ]}
              >
                {num}
              </Text>
            </View>
            {num < 3 && <View style={[styles.stepLine, step > num && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <Button
              mode="outlined"
              onPress={handlePrevious}
              style={styles.button}
            >
              Previous
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.button, step === 1 && styles.fullWidth]}
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
              Submit
            </Button>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#6C63FF',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#6C63FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  input: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  radioContainer: {
    marginVertical: 16,
  },
  radioLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
  },
  biometricCard: {
    marginBottom: 20,
    elevation: 3,
  },
  biometricContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  captureArea: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  captureText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C63FF',
  },
  imageContainer: {
    position: 'relative',
  },
  faceImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    padding: 8,
  },
  addressSection: {
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  fullWidth: {
    marginHorizontal: 0,
  },
});

export default AddScholarScreen;