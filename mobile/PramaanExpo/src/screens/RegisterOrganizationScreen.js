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
  HelperText,
  RadioButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { authService } from '../services/api';

const RegisterOrganizationScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Organization details
  const [orgData, setOrgData] = useState({
    organizationName: '',
    type: 'educational',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
  });
  
  // Admin details
  const [adminData, setAdminData] = useState({
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminPhone: '',
  });
  
  // Location boundaries (optional)
  const [boundaries, setBoundaries] = useState({
    enableGeofencing: false,
    center: null,
    radius: 500,
  });

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateStep1 = () => {
    if (!orgData.organizationName || !orgData.address || !orgData.city || 
        !orgData.state || !orgData.pincode || !orgData.contactNumber) {
      Alert.alert('Error', 'Please fill all organization details');
      return false;
    }
    
    if (orgData.contactNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid contact number');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (!adminData.adminName || !adminData.adminEmail || 
        !adminData.adminPassword || !adminData.confirmPassword) {
      Alert.alert('Error', 'Please fill all admin details');
      return false;
    }

    if (!validateEmail(adminData.adminEmail)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }

    if (adminData.adminPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }

    if (adminData.adminPassword !== adminData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
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

  const handleRegister = async () => {
    try {
      setLoading(true);

      const registrationData = {
        organization: {
          name: orgData.organizationName,
          type: orgData.type,
          address: `${orgData.address}, ${orgData.city}, ${orgData.state} - ${orgData.pincode}`,
          city: orgData.city,
          state: orgData.state,
          contactNumber: orgData.contactNumber,
        },
        admin: {
          name: adminData.adminName,
          email: adminData.adminEmail,
          password: adminData.adminPassword,
          phone: adminData.adminPhone || orgData.contactNumber,
        },
        boundaries: boundaries.enableGeofencing ? boundaries : null,
      };

      const response = await authService.registerOrganization(registrationData);

      if (response.success) {
        Alert.alert(
          'Registration Successful!',
          `Your organization has been registered successfully.\n\nOrganization Code: ${response.organizationCode}\n\nPlease save this code. Your scholars will need it to register.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to admin dashboard
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'AdminDashboard' }],
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.error || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Organization Information</Text>
      
      <TextInput
        label="Organization Name"
        value={orgData.organizationName}
        onChangeText={(text) => setOrgData({...orgData, organizationName: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <View style={styles.radioContainer}>
        <Text style={styles.radioLabel}>Organization Type:</Text>
        <RadioButton.Group
          onValueChange={(value) => setOrgData({...orgData, type: value})}
          value={orgData.type}
        >
          <View style={styles.radioRow}>
            <RadioButton.Item label="Educational" value="educational" />
            <RadioButton.Item label="Corporate" value="corporate" />
          </View>
        </RadioButton.Group>
      </View>

      <TextInput
        label="Address"
        value={orgData.address}
        onChangeText={(text) => setOrgData({...orgData, address: text})}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={2}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <View style={styles.row}>
        <TextInput
          label="City"
          value={orgData.city}
          onChangeText={(text) => setOrgData({...orgData, city: text})}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        
        <TextInput
          label="State"
          value={orgData.state}
          onChangeText={(text) => setOrgData({...orgData, state: text})}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
      </View>

      <View style={styles.row}>
        <TextInput
          label="Pincode"
          value={orgData.pincode}
          onChangeText={(text) => setOrgData({...orgData, pincode: text})}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="numeric"
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
        
        <TextInput
          label="Contact Number"
          value={orgData.contactNumber}
          onChangeText={(text) => setOrgData({...orgData, contactNumber: text})}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="phone-pad"
          outlineColor="#6C63FF"
          activeOutlineColor="#6C63FF"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Admin Account Details</Text>
      
      <TextInput
        label="Admin Name"
        value={adminData.adminName}
        onChangeText={(text) => setAdminData({...adminData, adminName: text})}
        style={styles.input}
        mode="outlined"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Admin Email"
        value={adminData.adminEmail}
        onChangeText={(text) => setAdminData({...adminData, adminEmail: text})}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Admin Phone (Optional)"
        value={adminData.adminPhone}
        onChangeText={(text) => setAdminData({...adminData, adminPhone: text})}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Password"
        value={adminData.adminPassword}
        onChangeText={(text) => setAdminData({...adminData, adminPassword: text})}
        style={styles.input}
        mode="outlined"
        secureTextEntry
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="info" visible={true}>
        Password must be at least 8 characters
      </HelperText>

      <TextInput
        label="Confirm Password"
        value={adminData.confirmPassword}
        onChangeText={(text) => setAdminData({...adminData, confirmPassword: text})}
        style={styles.input}
        mode="outlined"
        secureTextEntry
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
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
          <Text style={styles.reviewItem}>
            Address: {orgData.address}, {orgData.city}, {orgData.state} - {orgData.pincode}
          </Text>
          <Text style={styles.reviewItem}>Contact: {orgData.contactNumber}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewTitle}>Admin Details</Text>
          <Text style={styles.reviewItem}>Name: {adminData.adminName}</Text>
          <Text style={styles.reviewItem}>Email: {adminData.adminEmail}</Text>
          <Text style={styles.reviewItem}>Phone: {adminData.adminPhone || orgData.contactNumber}</Text>
        </Card.Content>
      </Card>

      <View style={styles.termsContainer}>
        <Icon name="info-outline" size={20} color="#666" />
        <Text style={styles.termsText}>
          By registering, you agree to our Terms of Service and Privacy Policy
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Register Organization</Text>
          </View>

          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.stepWrapper}>
                <View
                  style={[
                    styles.stepCircle,
                    step >= i && styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      step >= i && styles.stepNumberActive,
                    ]}
                  >
                    {i}
                  </Text>
                </View>
                {i < 3 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          <Card style={styles.card}>
            <Card.Content>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              
              <View style={styles.buttonContainer}>
                {step > 1 && (
                  <Button
                    mode="outlined"
                    onPress={() => setStep(step - 1)}
                    style={styles.backButton}
                  >
                    Back
                  </Button>
                )}
                
                {step < 3 ? (
                  <Button
                    mode="contained"
                    onPress={handleNext}
                    style={styles.nextButton}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                    onPress={handleRegister}
                    loading={loading}
                    disabled={loading}
                    style={styles.nextButton}
                  >
                    Register Organization
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginText}>
              Already have an organization? <Text style={styles.loginTextBold}>Login here</Text>
            </Text>
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#6C63FF',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#6C63FF',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48,
  },
  radioContainer: {
    marginBottom: 16,
  },
  radioLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  radioRow: {
    flexDirection: 'row',
  },
  reviewCard: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  reviewItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    flex: 0.48,
  },
  nextButton: {
    flex: 0.48,
    backgroundColor: '#6C63FF',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginTextBold: {
    fontWeight: 'bold',
    color: '#6C63FF',
  },
});

export default RegisterOrganizationScreen;
