// mobile/PramaanExpo/src/screens/RegisterOrganizationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  RadioButton,
  Card,
  Checkbox,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RegisterOrganizationScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
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

  // Boundaries data
  const [boundaries, setBoundaries] = useState({
    enableGeofencing: false,
    campusRadius: '500',
    centerLatitude: '',
    centerLongitude: '',
  });

  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!orgData.organizationName) {
      newErrors.organizationName = 'Organization name is required';
    }
    
    if (!orgData.address) {
      newErrors.address = 'Address is required';
    }
    
    if (!orgData.city) {
      newErrors.city = 'City is required';
    }
    
    if (!orgData.state) {
      newErrors.state = 'State is required';
    }
    
    if (!orgData.pincode) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(orgData.pincode)) {
      newErrors.pincode = 'Invalid pincode';
    }
    
    if (!orgData.contactNumber) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^\d{10}$/.test(orgData.contactNumber)) {
      newErrors.contactNumber = 'Invalid contact number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!adminData.adminName) {
      newErrors.adminName = 'Name is required';
    }
    
    if (!adminData.adminEmail) {
      newErrors.adminEmail = 'Email is required';
    } else if (!validateEmail(adminData.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }
    
    if (!adminData.adminPassword) {
      newErrors.adminPassword = 'Password is required';
    } else if (adminData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    }
    
    if (adminData.adminPassword !== adminData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setErrors({});
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
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
        boundaries: boundaries.enableGeofencing ? {
          enabled: true,
          radius: parseInt(boundaries.campusRadius),
          center: {
            latitude: parseFloat(boundaries.centerLatitude),
            longitude: parseFloat(boundaries.centerLongitude),
          }
        } : null,
      };

      const response = await authService.registerOrganization(registrationData);

      if (response && response.organizationCode) {
        Alert.alert(
          'Registration Successful!',
          `Your organization has been registered successfully.\n\nOrganization Code: ${response.organizationCode}\n\nPlease save this code. Your scholars will need it to register.\n\nYou can now login with your admin credentials.`,
          [
            {
              text: 'Login Now',
              onPress: async () => {
                // Auto-login the admin
                const loginResponse = await login({
                  email: adminData.adminEmail,
                  password: adminData.adminPassword
                }, 'admin');
                
                if (!loginResponse.success) {
                  // If auto-login fails, navigate to login screen
                  navigation.navigate('Login');
                }
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
        label="Organization Name *"
        value={orgData.organizationName}
        onChangeText={(text) => setOrgData({...orgData, organizationName: text})}
        style={styles.input}
        mode="outlined"
        error={!!errors.organizationName}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="error" visible={!!errors.organizationName}>
        {errors.organizationName}
      </HelperText>

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
        label="Address *"
        value={orgData.address}
        onChangeText={(text) => setOrgData({...orgData, address: text})}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={2}
        error={!!errors.address}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="error" visible={!!errors.address}>
        {errors.address}
      </HelperText>

      <View style={styles.row}>
        <View style={styles.halfInputContainer}>
          <TextInput
            label="City *"
            value={orgData.city}
            onChangeText={(text) => setOrgData({...orgData, city: text})}
            style={styles.input}
            mode="outlined"
            error={!!errors.city}
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
          />
          <HelperText type="error" visible={!!errors.city}>
            {errors.city}
          </HelperText>
        </View>

        <View style={styles.halfInputContainer}>
          <TextInput
            label="State *"
            value={orgData.state}
            onChangeText={(text) => setOrgData({...orgData, state: text})}
            style={styles.input}
            mode="outlined"
            error={!!errors.state}
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
          />
          <HelperText type="error" visible={!!errors.state}>
            {errors.state}
          </HelperText>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInputContainer}>
          <TextInput
            label="Pincode *"
            value={orgData.pincode}
            onChangeText={(text) => setOrgData({...orgData, pincode: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            maxLength={6}
            error={!!errors.pincode}
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
          />
          <HelperText type="error" visible={!!errors.pincode}>
            {errors.pincode}
          </HelperText>
        </View>

        <View style={styles.halfInputContainer}>
          <TextInput
            label="Contact Number *"
            value={orgData.contactNumber}
            onChangeText={(text) => setOrgData({...orgData, contactNumber: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
            maxLength={10}
            error={!!errors.contactNumber}
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
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
      <Text style={styles.stepTitle}>Admin Details</Text>
      
      <TextInput
        label="Admin Name *"
        value={adminData.adminName}
        onChangeText={(text) => setAdminData({...adminData, adminName: text})}
        style={styles.input}
        mode="outlined"
        error={!!errors.adminName}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="error" visible={!!errors.adminName}>
        {errors.adminName}
      </HelperText>

      <TextInput
        label="Admin Email *"
        value={adminData.adminEmail}
        onChangeText={(text) => setAdminData({...adminData, adminEmail: text})}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        error={!!errors.adminEmail}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="error" visible={!!errors.adminEmail}>
        {errors.adminEmail}
      </HelperText>

      <TextInput
        label="Admin Phone"
        value={adminData.adminPhone}
        onChangeText={(text) => setAdminData({...adminData, adminPhone: text})}
        style={styles.input}
        mode="outlined"
        keyboardType="phone-pad"
        maxLength={10}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />

      <TextInput
        label="Password *"
        value={adminData.adminPassword}
        onChangeText={(text) => setAdminData({...adminData, adminPassword: text})}
        style={styles.input}
        mode="outlined"
        secureTextEntry
        error={!!errors.adminPassword}
        outlineColor="#6C63FF"
        activeOutlineColor="#6C63FF"
      />
      <HelperText type="error" visible={!!errors.adminPassword}>
        {errors.adminPassword}
      </HelperText>

      <TextInput
        label="Confirm Password *"
        value={adminData.confirmPassword}
        onChangeText={(text) => setAdminData({...adminData, confirmPassword: text})}
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
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Campus Boundaries (Optional)</Text>
      
      <View style={styles.checkboxContainer}>
        <Checkbox
          status={boundaries.enableGeofencing ? 'checked' : 'unchecked'}
          onPress={() => setBoundaries({
            ...boundaries,
            enableGeofencing: !boundaries.enableGeofencing
          })}
          color="#6C63FF"
        />
        <Text style={styles.checkboxLabel}>Enable Geofencing</Text>
      </View>

      {boundaries.enableGeofencing && (
        <>
          <TextInput
            label="Campus Radius (meters)"
            value={boundaries.campusRadius}
            onChangeText={(text) => setBoundaries({...boundaries, campusRadius: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
          />

          <TextInput
            label="Center Latitude"
            value={boundaries.centerLatitude}
            onChangeText={(text) => setBoundaries({...boundaries, centerLatitude: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g., 28.6139"
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
          />

          <TextInput
            label="Center Longitude"
            value={boundaries.centerLongitude}
            onChangeText={(text) => setBoundaries({...boundaries, centerLongitude: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
            placeholder="e.g., 77.2090"
            outlineColor="#6C63FF"
            activeOutlineColor="#6C63FF"
          />
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Organization</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((num) => (
          <View key={num} style={styles.stepWrapper}>
            <View style={[styles.stepCircle, step >= num && styles.stepActive]}>
              <Text style={[styles.stepNumber, step >= num && styles.stepNumberActive]}>
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
              onPress={handleBack}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.button, styles.primaryButton]}
              contentStyle={styles.buttonContent}
            >
              Next
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleRegister}
              style={[styles.button, styles.primaryButton]}
              contentStyle={styles.buttonContent}
              loading={loading}
              disabled={loading}
            >
              Register
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
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  stepWrapper: {
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
  stepActive: {
    backgroundColor: '#6C63FF',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  stepLineActive: {
    backgroundColor: '#6C63FF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  radioContainer: {
    marginBottom: 16,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
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
  primaryButton: {
    backgroundColor: '#6C63FF',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default RegisterOrganizationScreen;