import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const RegisterOrgScreen = ({ navigation }: any) => {
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async () => {
    // Validation
    if (!orgName || !adminName || !adminEmail || !adminPassword || !address || !contactNumber) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!validateEmail(adminEmail)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (adminPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (adminPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // TODO: Implement actual API call
      // Simulate registration
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Success',
          'Organization registered successfully! You can now login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

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
          <View style={styles.content}>
            <Text style={styles.title}>Register Your Organization</Text>
            <Text style={styles.subtitle}>
              Join Pramaan to manage attendance with privacy
            </Text>

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Organization Details</Text>
                
                <TextInput
                  label="Organization Name"
                  value={orgName}
                  onChangeText={setOrgName}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                />

                <TextInput
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                />

                <TextInput
                  label="Contact Number"
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="phone-pad"
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                />

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Admin Details
                </Text>

                <TextInput
                  label="Admin Name"
                  value={adminName}
                  onChangeText={setAdminName}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                />

                <TextInput
                  label="Admin Email"
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                />
                <HelperText type="info" visible={true}>
                  This will be your login email
                </HelperText>

                <TextInput
                  label="Password"
                  value={adminPassword}
                  onChangeText={setAdminPassword}
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
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  mode="outlined"
                  secureTextEntry
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                />

                <Button
                  mode="contained"
                  onPress={handleRegister}
                  style={styles.registerButton}
                  contentStyle={styles.buttonContent}
                  loading={loading}
                  disabled={loading}
                >
                  Register Organization
                </Button>
              </Card.Content>
            </Card>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                compact
              >
                Login
              </Button>
            </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    elevation: 4,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  registerButton: {
    marginTop: 20,
    backgroundColor: '#6C63FF',
  },
  buttonContent: {
    height: 50,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default RegisterOrgScreen;