// mobile/PramaanExpo/src/screens/RegisterOrganizationScreen.js
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
  ProgressBar,
  Avatar,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const RegisterOrganizationScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Organization data
  const [orgData, setOrgData] = useState({
    organizationName: '',
    type: 'educational',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
  });

  // Admin data
  const [adminData, setAdminData] = useState({
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!orgData.organizationName) newErrors.organizationName = 'Organization name is required';
    if (!orgData.address) newErrors.address = 'Address is required';
    if (!orgData.city) newErrors.city = 'City is required';
    if (!orgData.state) newErrors.state = 'State is required';
    if (!orgData.pincode) newErrors.pincode = 'Pincode is required';
    if (!orgData.contactNumber) newErrors.contactNumber = 'Contact number is required';
    
    if (orgData.pincode && !/^\d{6}$/.test(orgData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    
    if (orgData.contactNumber && !/^\d{10}$/.test(orgData.contactNumber)) {
      newErrors.contactNumber = 'Contact number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!adminData.adminName) newErrors.adminName = 'Admin name is required';
    if (!adminData.adminEmail) newErrors.adminEmail = 'Admin email is required';
    if (!adminData.adminPhone) newErrors.adminPhone = 'Admin phone is required';
    if (!adminData.adminPassword) newErrors.adminPassword = 'Password is required';
    
    if (adminData.adminEmail && !validateEmail(adminData.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email';
    }
    
    if (adminData.adminPassword && adminData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    }
    
    if (adminData.adminPassword !== adminData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (adminData.adminPhone && !/^\d{10}$/.test(adminData.adminPhone)) {
      newErrors.adminPhone = 'Phone number must be 10 digits';
    }

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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const result = await register(orgData, adminData);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Organization registered successfully! You can now login as admin.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Failed to register organization');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', 'Please check your details and try again');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Organization Details</Text>
      
      <TextInput
        label="Organization Name *"
        value={orgData.organizationName}
        onChangeText={(text) => setOrgData({ ...orgData, organizationName: text })}
        mode="outlined"
        style={styles.input}
        error={!!errors.organizationName}
      />
      <HelperText type="error" visible={!!errors.organizationName}>
        {errors.organizationName}
      </HelperText>

      <View style={styles.radioGroup}>
        <Text style={styles.radioLabel}>Organization Type:</Text>
        <RadioButton.Group
          onValueChange={(value) => setOrgData({ ...orgData, type: value })}
          value={orgData.type}
        >
          <View style={styles.radioOption}>
            <RadioButton value="educational" />
            <Text style={styles.radioText}>Educational Institution</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="corporate" />
            <Text style={styles.radioText}>Corporate Office</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="government" />
            <Text style={styles.radioText}>Government Office</Text>
          </View>
        </RadioButton.Group>
      </View>

      <TextInput
        label="Complete Address *"
        value={orgData.address}
        onChangeText={(text) => setOrgData({ ...orgData, address: text })}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
        error={!!errors.address}
      />
      <HelperText type="error" visible={!!errors.address}>
        {errors.address}
      </HelperText>

      <View style={styles.rowInputs}>
        <View style={styles.halfInput}>
          <TextInput
            label="City *"
            value={orgData.city}
            onChangeText={(text) => setOrgData({ ...orgData, city: text })}
            mode="outlined"
            error={!!errors.city}
          />
          <HelperText type="error" visible={!!errors.city}>
            {errors.city}
          </HelperText>
        </View>
        
        <View style={styles.halfInput}>
          <TextInput
            label="State *"
            value={orgData.state}
            onChangeText={(text) => setOrgData({ ...orgData, state: text })}
            mode="outlined"
            error={!!errors.state}
          />
          <HelperText type="error" visible={!!errors.state}>
            {errors.state}
          </HelperText>
        </View>
      </View>

      <View style={styles.rowInputs}>
        <View style={styles.halfInput}>
          <TextInput
            label="Pincode *"
            value={orgData.pincode}
            onChangeText={(text) => setOrgData({ ...orgData, pincode: text })}
            mode="outlined"
            keyboardType="numeric"
            error={!!errors.pincode}
          />
          <HelperText type="error" visible={!!errors.pincode}>
            {errors.pincode}
          </HelperText>
        </View>
        
        <View style={styles.halfInput}>
          <TextInput
            label="Contact Number *"
            value={orgData.contactNumber}
            onChangeText={(text) => setOrgData({ ...orgData, contactNumber: text })}
            mode="outlined"
            keyboardType="phone-pad"
            error={!!errors.contactNumber}
          />
          <HelperText type="error" visible={!!errors.contactNumber}>
            {errors.contactNumber}
          </HelperText>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Admin Account Setup</Text>
      
      <TextInput
        label="Admin Full Name *"
        value={adminData.adminName}
        onChangeText={(text) => setAdminData({ ...adminData, adminName: text })}
        mode="outlined"
        style={styles.input}
        error={!!errors.adminName}
      />
      <HelperText type="error" visible={!!errors.adminName}>
        {errors.adminName}
      </HelperText>

      <TextInput
        label="Admin Email *"
        value={adminData.adminEmail}
        onChangeText={(text) => setAdminData({ ...adminData, adminEmail: text })}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        error={!!errors.adminEmail}
      />
      <HelperText type="error" visible={!!errors.adminEmail}>
        {errors.adminEmail}
      </HelperText>

      <TextInput
        label="Admin Phone *"
        value={adminData.adminPhone}
        onChangeText={(text) => setAdminData({ ...adminData, adminPhone: text })}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        error={!!errors.adminPhone}
      />
      <HelperText type="error" visible={!!errors.adminPhone}>
        {errors.adminPhone}
      </HelperText>

      <TextInput
        label="Admin Password *"
        value={adminData.adminPassword}
        onChangeText={(text) => setAdminData({ ...adminData, adminPassword: text })}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        error={!!errors.adminPassword}
      />
      <HelperText type="error" visible={!!errors.adminPassword}>
        {errors.adminPassword}
      </HelperText>

      <TextInput
        label="Confirm Password *"
        value={adminData.confirmPassword}
        onChangeText={(text) => setAdminData({ ...adminData, confirmPassword: text })}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        error={!!errors.confirmPassword}
      />
      <HelperText type="error" visible={!!errors.confirmPassword}>
        {errors.confirmPassword}
      </HelperText>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Review & Confirm</Text>
      
      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewTitle}>Organization Details</Text>
          <Text style={styles.reviewItem}>Name: {orgData.organizationName}</Text>
          <Text style={styles.reviewItem}>Type: {orgData.type}</Text>
          <Text style={styles.reviewItem}>Address: {orgData.address}</Text>
          <Text style={styles.reviewItem}>City: {orgData.city}, {orgData.state}</Text>
          <Text style={styles.reviewItem}>Pincode: {orgData.pincode}</Text>
          <Text style={styles.reviewItem}>Contact: {orgData.contactNumber}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewTitle}>Admin Account</Text>
          <Text style={styles.reviewItem}>Name: {adminData.adminName}</Text>
          <Text style={styles.reviewItem}>Email: {adminData.adminEmail}</Text>
          <Text style={styles.reviewItem}>Phone: {adminData.adminPhone}</Text>
        </Card.Content>
      </Card>

      <View style={styles.noteContainer}>
        <Avatar.Icon size={32} icon="information" style={styles.infoIcon} />
        <Text style={styles.noteText}>
          A unique organization code will be generated after registration. 
          This code will be required for scholar registration.
        </Text>
      </View>
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
          <Text style={styles.headerTitle}>Register Organization</Text>
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
              Register Organization
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
  radioGroup: {
    marginVertical: 16,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  reviewCard: {
    marginBottom: 16,
    elevation: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2C3E50',
  },
  reviewItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoIcon: {
    backgroundColor: '#2196F3',
    marginRight: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
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

export default RegisterOrganizationScreen;