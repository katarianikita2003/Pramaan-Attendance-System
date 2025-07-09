// src/screens/WelcomeScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Welcome to Pramaan</Text>
          <Text style={styles.subHeaderText}>Privacy-First Attendance System</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>For Organizations</Title>
            <Paragraph style={styles.cardText}>
              Register your institution and manage attendance with complete privacy protection
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('RegisterOrg')}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Register Organization
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Login', { role: 'admin' })}
              style={styles.secondaryButton}
            >
              Admin Login
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>For Scholars</Title>
            <Paragraph style={styles.cardText}>
              Mark your attendance securely using biometric authentication
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login', { role: 'scholar' })}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Scholar Login
            </Button>
          </Card.Content>
        </Card>

        <Surface style={styles.infoSection}>
          <Title style={styles.infoTitle}>Why Pramaan?</Title>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔐</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Zero-Knowledge Proof</Text>
              <Text style={styles.featureText}>
                Your biometric data never leaves your device
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🌐</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Multi-Organization</Text>
              <Text style={styles.featureText}>
                One app for all institutions with data isolation
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✅</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Verifiable Attendance</Text>
              <Text style={styles.featureText}>
                Generate cryptographic proofs for each attendance
              </Text>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
    paddingVertical: 20,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    marginBottom: 8,
  },
  cardText: {
    marginBottom: 16,
    color: '#666',
  },
  primaryButton: {
    marginBottom: 12,
    backgroundColor: '#6C63FF',
  },
  secondaryButton: {
    borderColor: '#6C63FF',
  },
  buttonContent: {
    paddingVertical: 6,
  },
  infoSection: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
});