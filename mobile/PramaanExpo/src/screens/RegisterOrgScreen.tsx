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
  Checkbox,
  Paragraph,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
export default function RegisterOrgScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Organization details
  const [orgData, setOrgData] = useState({
    name: '',
    type: 'university', // university, school, office
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
  });
  // Admin details
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  // Campus boundaries (for geofencing)
  const [boundaries, setBoundaries] = useState({
    latitude: '',
    longitude: '',
    radius: '500', // meters
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const validateStep1 = () => {
    if (!orgData.name || !orgData.address || !orgData.city) {
      Alert.alert('Error', 'Please fill all organization details');
      return false;
    }
    return true;
  };
  const validateStep2 = () => {
    if (!adminData.name || !adminData.email || !adminData.password) {
      Alert.alert('Error', 'Please fill all admin details');
      return false;
    }
    if (adminData.password !== adminData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (adminData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }
    return true;
  };
  const handleRegister = async () => {
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to terms and conditions');
      return;
    }
    setLoading(true);
    try {
      const registrationData = {
        organization: orgData,
        admin: adminData,
        boundaries: {
          center: {
            latitude: parseFloat(boundaries.latitude) || 0,
            longitude: parseFloat(boundaries.longitude) || 0,
          },
          radius: parseInt(boundaries.radius) || 500,
        },
      };
      const response = await api.post('/auth/register-organization', registrationData);
      if (response.data.success) {
        Alert.alert(
          'Success',
          `Organization registered successfully! Your organization code is: ${response.data.organizationCode}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login', { role: 'admin' }),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };
  const renderStep1 = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Organization Details</Title>
        <TextInput
          label="Organization Name"
          value={orgData.name}
          onChangeText={(text) => setOrgData({ ...orgData, name: text })}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Address"
          value={orgData.address}
          onChangeText={(text) => setOrgData({ ...orgData, address: text })}
          mode="outlined"
          multiline
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            label="City"
            value={orgData.city}
            onChangeText={(text) => setOrgData({ ...orgData, city: text })}
            mode="outlined"
            style={[styles.input, styles.halfInput]}
          />
          <TextInput
            label="State"
            value={orgData.state}
            onChangeText={(text) => setOrgData({ ...orgData, state: text })}
            mode="outlined"
            style={[styles.input, styles.halfInput]}
          />
        </View>
        <Button
          mode="contained"
          onPress={() => validateStep1() && setStep(2)}
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
        <Title>Admin Account</Title>
        <TextInput
          label="Admin Name"
          value={adminData.name}
          onChangeText={(text) => setAdminData({ ...adminData, name: text })}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Email"
          value={adminData.email}
          onChangeText={(text) => setAdminData({ ...adminData, email: text })}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          label="Phone"
          value={adminData.phone}
          onChangeText={(text) => setAdminData({ ...adminData, phone: text })}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={adminData.password}
          onChangeText={(text) => setAdminData({ ...adminData, password: text })}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          label="Confirm Password"
          value={adminData.confirmPassword}
          onChangeText={(text) => setAdminData({ ...adminData, confirmPassword: text })}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(1)}
            style={[styles.button, styles.halfButton]}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={() => validateStep2() && setStep(3)}
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
        <Title>Campus Settings</Title>
        <Paragraph style={styles.paragraph}>
          Set the campus boundaries for attendance marking (optional)
        </Paragraph>
        <TextInput
          label="Latitude"
          value={boundaries.latitude}
          onChangeText={(text) => setBoundaries({ ...boundaries, latitude: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          label="Longitude"
          value={boundaries.longitude}
          onChangeText={(text) => setBoundaries({ ...boundaries, longitude: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          label="Radius (meters)"
          value={boundaries.radius}
          onChangeText={(text) => setBoundaries({ ...boundaries, radius: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
        />
        <Surface style={styles.termsContainer}>
          <View style={styles.checkboxRow}>
            <Checkbox
              status={agreedToTerms ? 'checked' : 'unchecked'}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            />
            <Paragraph style={styles.termsText}>
              I agree to the terms and conditions and privacy policy
            </Paragraph>
          </View>
        </Surface>
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(2)}
            style={[styles.button, styles.halfButton]}
          >
            Back
          </Button>
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || !agreedToTerms}
            style={[styles.button, styles.halfButton]}
          >
            Register
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
          <Surface style={styles.stepIndicator}>
            <View style={styles.steps}>
              <View style={[styles.step, step >= 1 && styles.activeStep]}>
                <Paragraph>1</Paragraph>
              </View>
              <View style={[styles.stepLine, step >= 2 && styles.activeStepLine]} />
              <View style={[styles.step, step >= 2 && styles.activeStep]}>
                <Paragraph>2</Paragraph>
              </View>
              <View style={[styles.stepLine, step >= 3 && styles.activeStepLine]} />
              <View style={[styles.step, step >= 3 && styles.activeStep]}>
                <Paragraph>3</Paragraph>
              </View>
            </View>
          </Surface>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
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
  stepIndicator: {
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#6C63FF',
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
  card: {
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
  paragraph: {
    marginBottom: 16,
    color: '#666',
  },
  termsContainer: {
    padding: 12,
    marginVertical: 16,
    borderRadius: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    marginLeft: 8,
  },
});
