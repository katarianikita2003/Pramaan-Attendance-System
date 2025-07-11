// mobile/PramaanExpo/src/screens/WelcomeScreen.js
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Icon name="shield-check" size={80} color="#6C63FF" />
          <Text style={styles.headerText}>Welcome to Pramaan</Text>
          <Text style={styles.subHeaderText}>Zero-Knowledge Proof Attendance System</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Icon name="account-cog" size={48} color="#6C63FF" style={styles.cardIcon} />
            <Title style={styles.cardTitle}>Organization Admin</Title>
            <Paragraph style={styles.cardText}>
              Register your organization or login to manage scholars and attendance
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('RegisterOrganization')}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Register Organization
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Login', { userType: 'admin' })}
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
            >
              Admin Login
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Icon name="school" size={48} color="#4CAF50" style={styles.cardIcon} />
            <Title style={styles.cardTitle}>Scholar/Student</Title>
            <Paragraph style={styles.cardText}>
              Join your organization and mark attendance with biometric authentication
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login', { userType: 'scholar' })}
              style={[styles.primaryButton, { backgroundColor: '#4CAF50' }]}
              contentStyle={styles.buttonContent}
            >
              Scholar Login
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Secure • Private • Tamper-Proof</Text>
        </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    marginBottom: 20,
    elevation: 4,
  },
  cardIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cardText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 14,
  },
});