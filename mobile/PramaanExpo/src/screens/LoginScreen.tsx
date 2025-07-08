import React, { useState } from 'react';
<<<<<<< Updated upstream
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
  RadioButton,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }: any) => {
  const [userType, setUserType] = useState('scholar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scholarId, setScholarId] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      if (userType === 'admin') {
        if (!email || !password) {
          Alert.alert('Error', 'Please fill all fields');
          return;
        }

        // TODO: Implement actual API call
        // For now, simulate login
        setTimeout(() => {
          setLoading(false);
          navigation.replace('AdminDashboard');
        }, 1500);
      } else {
        if (!scholarId || !orgCode) {
          Alert.alert('Error', 'Please fill all fields');
          return;
        }

        // TODO: Implement biometric authentication
        Alert.alert(
          'Biometric Authentication',
          'Place your finger on the sensor or look at the camera',
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  setLoading(false);
                  navigation.replace('ScholarDashboard');
                }, 1500);
              },
            },
          ]
        );
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Login failed. Please try again.');
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
            <Text style={styles.title}>Login to Pramaan</Text>

            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.radioContainer}>
                  <View style={styles.radioOption}>
                    <RadioButton
                      value="scholar"
                      status={userType === 'scholar' ? 'checked' : 'unchecked'}
                      onPress={() => setUserType('scholar')}
                      color="#6C63FF"
                    />
                    <Text style={styles.radioLabel}>Scholar</Text>
                  </View>
                  <View style={styles.radioOption}>
                    <RadioButton
                      value="admin"
                      status={userType === 'admin' ? 'checked' : 'unchecked'}
                      onPress={() => setUserType('admin')}
                      color="#6C63FF"
                    />
                    <Text style={styles.radioLabel}>Admin</Text>
                  </View>
                </View>

                {userType === 'admin' ? (
                  <>
                    <TextInput
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      mode="outlined"
                      outlineColor="#6C63FF"
                      activeOutlineColor="#6C63FF"
                    />
                    <TextInput
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      style={styles.input}
                      secureTextEntry
                      mode="outlined"
                      outlineColor="#6C63FF"
                      activeOutlineColor="#6C63FF"
                    />
                  </>
                ) : (
                  <>
                    <TextInput
                      label="Scholar ID"
                      value={scholarId}
                      onChangeText={setScholarId}
                      style={styles.input}
                      autoCapitalize="characters"
                      mode="outlined"
                      outlineColor="#6C63FF"
                      activeOutlineColor="#6C63FF"
                    />
                    <TextInput
                      label="Organization Code"
                      value={orgCode}
                      onChangeText={setOrgCode}
                      style={styles.input}
                      autoCapitalize="characters"
                      mode="outlined"
                      outlineColor="#6C63FF"
                      activeOutlineColor="#6C63FF"
                    />
                  </>
                )}

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                  loading={loading}
                  disabled={loading}
                >
                  {userType === 'scholar' ? 'Proceed to Biometric' : 'Login'}
                </Button>

                {userType === 'admin' && (
                  <Button
                    mode="text"
                    onPress={() => Alert.alert('Info', 'Feature coming soon')}
                    style={styles.forgotButton}
                  >
                    Forgot Password?
                  </Button>
                )}
              </Card.Content>
            </Card>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an organization account?
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('RegisterOrg')}
                compact
              >
                Register Organization
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      )}
    </SafeAreaView>
=======
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation, route }) => {
  const { role } = route.params || {};
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // For demo, accept any credentials
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      if (role === 'admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('ScholarDashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{role === 'admin' ? 'Admin Login' : 'Scholar Login'}</Title>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          >
            Login
          </Button>
        </Card.Content>
      </Card>
    </View>
>>>>>>> Stashed changes
  );
};

const styles = StyleSheet.create({
<<<<<<< Updated upstream
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
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    elevation: 4,
    backgroundColor: '#fff',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  loginButton: {
    marginTop: 10,
    backgroundColor: '#6C63FF',
  },
  buttonContent: {
    height: 50,
  },
  forgotButton: {
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
=======
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  card: { margin: 20, elevation: 4 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
});

export default LoginScreen;
>>>>>>> Stashed changes
