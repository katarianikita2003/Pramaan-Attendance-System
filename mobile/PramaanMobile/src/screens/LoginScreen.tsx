import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';

const LoginScreen = ({ route }) => {
  const { role } = route.params || {};
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scholarId, setScholarId] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      Alert.alert('Success', 'Login successful (simulated)');
    } catch (error) {
      Alert.alert('Error', 'Connection failed. Make sure backend is running.');
    }
    setLoading(false);
  };

  const handleScholarLogin = () => {
    Alert.alert('Success', `Scholar ${scholarId} login (simulated)`);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{role === 'admin' ? 'Admin Login' : 'Scholar Login'}</Title>
          
          {role === 'admin' ? (
            <>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
              />
              <Button 
                mode="contained" 
                onPress={handleAdminLogin}
                loading={loading}
                style={styles.button}
              >
                Login
              </Button>
            </>
          ) : (
            <>
              <TextInput
                label="Scholar ID"
                value={scholarId}
                onChangeText={setScholarId}
                style={styles.input}
              />
              <TextInput
                label="Organization Code"
                value={orgCode}
                onChangeText={setOrgCode}
                style={styles.input}
              />
              <Button 
                mode="contained" 
                onPress={handleScholarLogin}
                style={styles.button}
              >
                Login
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginTop: 50,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
});

export default LoginScreen;