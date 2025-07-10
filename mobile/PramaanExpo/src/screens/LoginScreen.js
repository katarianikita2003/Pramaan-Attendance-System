// mobile/PramaanExpo/src/screens/LoginScreen.js
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
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  RadioButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [userType, setUserType] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (userType === 'scholar' && !organizationCode) {
      Alert.alert('Error', 'Please enter organization code');
      return;
    }

    try {
      setLoading(true);
      const result = await login(
        email,
        password,
        userType === 'scholar' ? organizationCode : null,
        userType
      );

      if (result.success) {
        // Navigation is handled by the auth context
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'Please check your credentials and try again');
    } finally {
      setLoading(false);
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
          {/* Logo/Header */}
          <View style={styles.header}>
            <Icon name="fingerprint" size={80} color="#6C63FF" />
            <Text style={styles.title}>Pramaan</Text>
            <Text style={styles.subtitle}>Secure Attendance System</Text>
          </View>

          {/* Login Form */}
          <Card style={styles.card}>
            <Card.Content>
              {/* User Type Selection */}
              <View style={styles.radioContainer}>
                <Text style={styles.radioLabel}>Login as:</Text>
                <RadioButton.Group
                  onValueChange={(value) => setUserType(value)}
                  value={userType}
                >
                  <View style={styles.radioRow}>
                    <RadioButton.Item label="Admin" value="admin" />
                    <RadioButton.Item label="Scholar" value="scholar" />
                  </View>
                </RadioButton.Group>
              </View>

              {/* Organization Code (for scholars) */}
              {userType === 'scholar' && (
                <TextInput
                  label="Organization Code"
                  value={organizationCode}
                  onChangeText={setOrganizationCode}
                  style={styles.input}
                  mode="outlined"
                  autoCapitalize="characters"
                  outlineColor="#6C63FF"
                  activeOutlineColor="#6C63FF"
                  left={<TextInput.Icon icon="domain" />}
                />
              )}

              {/* Email Input */}
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
                left={<TextInput.Icon icon="email" />}
              />

              {/* Password Input */}
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                mode="outlined"
                secureTextEntry={!showPassword}
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
              >
                Login
              </Button>

              <Divider style={styles.divider} />

              {/* Register Organization Button */}
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('RegisterOrganization')}
                style={styles.registerButton}
                contentStyle={styles.registerButtonContent}
                icon="plus-circle"
              >
                Register New Organization
              </Button>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Icon name="info-outline" size={16} color="#666" />
                <Text style={styles.helpText}>
                  {userType === 'admin' 
                    ? 'Use your admin email and password to login'
                    : 'Ask your organization admin for the organization code'}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Powered by Zero-Knowledge Proof Technology
            </Text>
            <View style={styles.securityBadges}>
              <Icon name="lock" size={16} color="#666" />
              <Text style={styles.securityText}>End-to-End Encrypted</Text>
              <Icon name="verified-user" size={16} color="#666" style={{ marginLeft: 10 }} />
              <Text style={styles.securityText}>Privacy Protected</Text>
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
    justifyContent: 'center',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  card: {
    marginHorizontal: 20,
    elevation: 4,
  },
  radioContainer: {
    marginBottom: 20,
  },
  radioLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  input: {
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#6C63FF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#6C63FF',
    marginBottom: 16,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  registerButton: {
    borderColor: '#6C63FF',
    marginBottom: 16,
  },
  registerButtonContent: {
    paddingVertical: 6,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  securityBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
});

export default LoginScreen;
