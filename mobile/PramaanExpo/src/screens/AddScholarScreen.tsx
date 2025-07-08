<<<<<<< Updated upstream
﻿import React, { useState } from 'react';
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
  Title,
  HelperText,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const AddScholarScreen = ({ navigation }: any) => {
  const [scholarData, setScholarData] = useState({
    name: '',
    email: '',
    phone: '',
    scholarId: '',
    department: '',
    course: '',
    year: '',
  });
  const [biometricCaptured, setBiometricCaptured] = useState({
    face: false,
    fingerprint: false,
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setScholarData(prev => ({ ...prev, [field]: value }));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const captureBiometric = (type: 'face' | 'fingerprint') => {
    Alert.alert(
      `Capture ${type === 'face' ? 'Face' : 'Fingerprint'}`,
      `Position the scholar's ${type === 'face' ? 'face in the camera' : 'finger on the sensor'}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Capture',
          onPress: () => {
            // Simulate biometric capture
            setTimeout(() => {
              setBiometricCaptured(prev => ({ ...prev, [type]: true }));
              Alert.alert('Success', `${type === 'face' ? 'Face' : 'Fingerprint'} captured successfully`);
            }, 2000);
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    // Validation
    const { name, email, phone, scholarId, department } = scholarData;
    
    if (!name || !email || !phone || !scholarId || !department) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    if (!biometricCaptured.face || !biometricCaptured.fingerprint) {
      Alert.alert('Error', 'Please capture both face and fingerprint biometrics');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual API call
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Success',
          'Scholar added successfully!',
          [
            {
              text: 'Add Another',
              onPress: () => {
                setScholarData({
                  name: '',
                  email: '',
                  phone: '',
                  scholarId: '',
                  department: '',
                  course: '',
                  year: '',
                });
                setBiometricCaptured({ face: false, fingerprint: false });
              },
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to add scholar. Please try again.');
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
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Personal Information</Title>

              <TextInput
                label="Full Name *"
                value={scholarData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                style={styles.input}
                mode="outlined"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />

              <TextInput
                label="Email *"
                value={scholarData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                style={styles.input}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />

              <TextInput
                label="Phone Number *"
                value={scholarData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                style={styles.input}
                mode="outlined"
                keyboardType="phone-pad"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Academic Information</Title>

              <TextInput
                label="Scholar ID *"
                value={scholarData.scholarId}
                onChangeText={(text) => handleInputChange('scholarId', text.toUpperCase())}
                style={styles.input}
                mode="outlined"
                autoCapitalize="characters"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />
              <HelperText type="info" visible={true}>
                This will be auto-generated if left empty
              </HelperText>

              <TextInput
                label="Department *"
                value={scholarData.department}
                onChangeText={(text) => handleInputChange('department', text)}
                style={styles.input}
                mode="outlined"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />

              <TextInput
                label="Course"
                value={scholarData.course}
                onChangeText={(text) => handleInputChange('course', text)}
                style={styles.input}
                mode="outlined"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />

              <TextInput
                label="Year"
                value={scholarData.year}
                onChangeText={(text) => handleInputChange('year', text)}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
                outlineColor="#6C63FF"
                activeOutlineColor="#6C63FF"
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Biometric Enrollment</Title>
              
              <View style={styles.biometricRow}>
                <View style={styles.biometricItem}>
                  <Text style={styles.biometricLabel}>Face Recognition</Text>
                  {biometricCaptured.face ? (
                    <Chip icon="check" style={styles.successChip}>Captured</Chip>
                  ) : (
                    <Button
                      mode="outlined"
                      onPress={() => captureBiometric('face')}
                      compact
                    >
                      Capture
                    </Button>
                  )}
                </View>

                <View style={styles.biometricItem}>
                  <Text style={styles.biometricLabel}>Fingerprint</Text>
                  {biometricCaptured.fingerprint ? (
                    <Chip icon="check" style={styles.successChip}>Captured</Chip>
                  ) : (
                    <Button
                      mode="outlined"
                      onPress={() => captureBiometric('fingerprint')}
                      compact
                    >
                      Capture
                    </Button>
                  )}
                </View>
              </View>

              <HelperText type="info" visible={true} style={styles.biometricHelp}>
                Both biometrics are required for enrollment
              </HelperText>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
            loading={loading}
            disabled={loading}
          >
            Add Scholar
          </Button>
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
    padding: 15,
  },
  card: {
    marginBottom: 15,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
    color: '#333',
  },
  input: {
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  biometricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  biometricItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  biometricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  successChip: {
    backgroundColor: '#E8F5E9',
  },
  biometricHelp: {
    textAlign: 'center',
  },
  submitButton: {
    marginVertical: 20,
    backgroundColor: '#6C63FF',
  },
  buttonContent: {
    height: 50,
  },
});

export default AddScholarScreen;
=======
﻿import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddScholarScreen() {
  return (
    <View style={styles.container}>
      <Text>Add Scholar Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
>>>>>>> Stashed changes
