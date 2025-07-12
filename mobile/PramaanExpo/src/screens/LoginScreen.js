// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  RadioButton,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [userType, setUserType] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (userType === 'scholar' && !organizationCode.trim()) {
      newErrors.organizationCode = 'Organization code is required for scholars';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('Login attempt:', {
        email,
        userType,
        passwordLength: password.length,
        hasOrgCode: userType === 'scholar' ? organizationCode : 'N/A'
      });

      const result = await login(
        email.trim().toLowerCase(),
        password,
        userType === 'scholar' ? organizationCode.trim() : null,
        userType
      );

      if (result.success) {
        console.log('Login successful');
        // Navigation will be handled automatically by AuthContext
      } else {
        console.log('Login failed:', result.error);
        Alert.alert(
          'Login Failed',
          result.error || 'Invalid credentials. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your administrator to reset your password.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <MaterialIcons name="verified-user" size={80} color="#6C63FF" />
            </View>
            <Text style={styles.appName}>Pramaan</Text>
            <Text style={styles.tagline}>Secure Attendance System</Text>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>

              <View style={styles.userTypeContainer}>
                <Text style={styles.userTypeLabel}>I am a:</Text>
                <RadioButton.Group
                  onValueChange={value => {
                    setUserType(value);
                    setErrors({});
                  }}
                  value={userType}
                >
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="Admin" value="admin" />
                    <RadioButton.Item label="Scholar" value="scholar" />
                  </View>
                </RadioButton.Group>
              </View>

              <TextInput
                label="Email"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: null });
                  }
                }}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email" />}
                error={!!errors.email}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>

              <TextInput
                label="Password"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: null });
                  }
                }}
                style={styles.input}
                mode="outlined"
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                error={!!errors.password}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              {userType === 'scholar' && (
                <>
                  <TextInput
                    label="Organization Code"
                    value={organizationCode}
                    onChangeText={text => {
                      setOrganizationCode(text);
                      if (errors.organizationCode) {
                        setErrors({ ...errors, organizationCode: null });
                      }
                    }}
                    style={styles.input}
                    mode="outlined"
                    autoCapitalize="characters"
                    left={<TextInput.Icon icon="domain" />}
                    error={!!errors.organizationCode}
                  />
                  <HelperText type="error" visible={!!errors.organizationCode}>
                    {errors.organizationCode}
                  </HelperText>
                </>
              )}

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              {userType === 'admin' && (
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>
                    New organization?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Registration',
                        'Please contact the system administrator to register your organization.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.registerLink}>Register here</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Test Credentials Info - Remove in production */}
          {__DEV__ && (
            <Card style={[styles.card, styles.debugCard]}>
              <Card.Content>
                <Text style={styles.debugTitle}>Test Credentials</Text>
                <Text style={styles.debugText}>Admin: admin1@gmail.com / Test@123</Text>
                <Text style={styles.debugText}>Scholar: scholar1@example.com / password123 / TEST001</Text>
              </Card.Content>
            </Card>
          )}
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
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  userTypeContainer: {
    marginBottom: 16,
  },
  userTypeLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  input: {
    marginBottom: 4,
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#6C63FF',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#856404',
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
});

export default LoginScreen;