import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';

const RegisterOrgScreen = ({ navigation }) => {
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      // API call would go here
      Alert.alert('Success', 'Organization registered! Code: ORG123', [
        { text: 'OK', onPress: () => navigation.replace('AdminDashboard') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Register Organization</Title>
          <TextInput label="Organization Name" value={orgName} onChangeText={setOrgName} mode="outlined" style={styles.input} />
          <TextInput label="Admin Name" value={adminName} onChangeText={setAdminName} mode="outlined" style={styles.input} />
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} />
          <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={handleRegister} loading={loading} style={styles.button}>
            Register
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 20, elevation: 4 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
});

export default RegisterOrgScreen;
