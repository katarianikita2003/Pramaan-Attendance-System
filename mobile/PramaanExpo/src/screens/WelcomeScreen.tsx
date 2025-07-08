import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>PRAMAAN</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome to Pramaan</Text>
        <Text style={styles.subtitle}>
          Secure, Private, and Verifiable Attendance System
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔐</Text>
            <Text style={styles.featureText}>Zero-Knowledge Proofs</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Biometric Authentication</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🏢</Text>
            <Text style={styles.featureText}>Multi-Organization Support</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
          >
            Login
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('RegisterOrg')}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            Register Organization
          </Button>
        </View>

        <Text style={styles.footerText}>
          Powered by Zero-Knowledge Cryptography
        </Text>
      </View>
    </SafeAreaView>

import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';

const WelcomeScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Pramaan</Text>
      </View>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>For Organizations</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('RegisterOrg')}
              style={styles.button}
            >
              Register Organization
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Login', { role: 'admin' })}
              style={styles.button}
            >
              Admin Login
            </Button>
          </Card.Content>
        </Card>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>For Scholars</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login', { role: 'scholar' })}
              style={styles.button}
            >
              Scholar Login
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  loginButton: {
    marginBottom: 15,
    backgroundColor: '#6C63FF',
  },
  registerButton: {
    borderColor: '#6C63FF',
  },
  buttonContent: {
    height: 50,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    position: 'absolute',
    bottom: 30,
  },
});

export default WelcomeScreen;
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1976D2', padding: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  card: { marginBottom: 20, elevation: 4 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  button: { marginBottom: 10 },
});

export default WelcomeScreen;
