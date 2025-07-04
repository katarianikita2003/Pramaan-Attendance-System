// ===== mobile/src/screens/auth/LoginScreen.js =====
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validateScholarId } from '../../utils/validators';

const LoginScreen = ({ navigation, route }) => {
  const { role } = route.params || {};
  const { loginAdmin, loginScholar, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    scholarId: '',
    organizationCode: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminLogin = async () => {
    const validationErrors = {};
    
    if (!validateEmail(formData.email)) {
      validationErrors.email = 'Invalid email address';
    }
    
    if (!formData.password || formData.password.length < 6) {
      validationErrors.password = 'Password must be at least 6 characters';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      await loginAdmin(formData.email, formData.password);
      navigation.reset({
        index: 0,
        routes: [{ name: 'AdminDashboard' }]
      });
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    }
  };

  const handleScholarLogin = async () => {
    const validationErrors = {};
    
    if (!validateScholarId(formData.scholarId)) {
      validationErrors.scholarId = 'Invalid scholar ID';
    }
    
    if (!formData.organizationCode) {
      validationErrors.organizationCode = 'Organization code is required';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      const result = await loginScholar(formData.scholarId, formData.organizationCode);
      
      if (!result.scholar.isEnrolled) {
        navigation.navigate('BiometricEnrollment', { 
          scholar: result.scholar 
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ScholarDashboard' }]
        });
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    }
  };

  const handleLogin = () => {
    if (role === 'admin') {
      handleAdminLogin();
    } else {
      handleScholarLogin();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>
              {role === 'admin' ? 'Admin Login' : 'Scholar Login'}
            </Title>
            <Paragraph style={styles.subtitle}>
              Enter your credentials to continue
            </Paragraph>

            {role === 'admin' ? (
              <>
                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    setErrors({ ...errors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={!!errors.email}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.email}>
                  {errors.email}
                </HelperText>

                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    setErrors({ ...errors, password: '' });
                  }}
                  secureTextEntry={!showPassword}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  error={!!errors.password}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>
              </>
            ) : (
              <>
                <TextInput
                  label="Scholar ID"
                  value={formData.scholarId}
                  onChangeText={(text) => {
                    setFormData({ ...formData, scholarId: text.toUpperCase() });
                    setErrors({ ...errors, scholarId: '' });
                  }}
                  autoCapitalize="characters"
                  error={!!errors.scholarId}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.scholarId}>
                  {errors.scholarId}
                </HelperText>

                <TextInput
                  label="Organization Code"
                  value={formData.organizationCode}
                  onChangeText={(text) => {
                    setFormData({ ...formData, organizationCode: text.toUpperCase() });
                    setErrors({ ...errors, organizationCode: '' });
                  }}
                  autoCapitalize="characters"
                  error={!!errors.organizationCode}
                  style={styles.input}
                />
                <HelperText type="error" visible={!!errors.organizationCode}>
                  {errors.organizationCode}
                </HelperText>
              </>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
            >
              Login
            </Button>

            {role === 'admin' && (
              <>
                <Divider style={styles.divider} />
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotButton}
                >
                  Forgot Password?
                </Button>
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 4,
  },
  loginButton: {
    marginTop: 16,
    paddingVertical: 6,
  },
  divider: {
    marginVertical: 16,
  },
  forgotButton: {
    alignSelf: 'center',
  },
});

export default LoginScreen;