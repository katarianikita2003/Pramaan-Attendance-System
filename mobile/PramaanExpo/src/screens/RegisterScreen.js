// mobile/PramaanExpo/src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationCode: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    campusLocation: {
      name: '',
      latitude: '',
      longitude: '',
      radius: '500', // Default radius in meters
    },
  });

  const handleRegister = async () => {
    try {
      // Validation
      if (!formData.organizationName || !formData.organizationCode || 
          !formData.adminName || !formData.adminEmail || 
          !formData.password || !formData.confirmPassword) {
        Alert.alert('Error', 'Please fill all required fields');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (formData.password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters long');
        return;
      }

      setLoading(true);

      // Prepare the data
      const registrationData = {
        organizationName: formData.organizationName,
        organizationCode: formData.organizationCode.toUpperCase(),
        adminName: formData.adminName,
        adminEmail: formData.adminEmail.toLowerCase(),
        password: formData.password,
      };

      // Add campus location if provided
      if (formData.campusLocation.name) {
        registrationData.campusLocation = {
          name: formData.campusLocation.name,
          coordinates: {
            latitude: parseFloat(formData.campusLocation.latitude) || 0,
            longitude: parseFloat(formData.campusLocation.longitude) || 0,
          },
          radius: parseInt(formData.campusLocation.radius) || 500,
        };
      }

      console.log('Registering organization:', registrationData);

      const response = await api.post('/auth/register', registrationData);

      if (response.data.success || response.data.token) {
        Alert.alert(
          'Success',
          'Organization registered successfully! You can now login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'Failed to register organization'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ marginTop: 40, marginBottom: 30 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#333' }}>
              Register Organization
            </Text>
            <Text style={{ fontSize: 16, textAlign: 'center', color: '#666', marginTop: 10 }}>
              Create your organization account
            </Text>
          </View>

          {/* Organization Details */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 }}>
              Organization Details
            </Text>
            
            <TextInput
              placeholder="Organization Name *"
              value={formData.organizationName}
              onChangeText={(value) => updateFormData('organizationName', value)}
              style={styles.input}
              placeholderTextColor="#999"
            />

            <TextInput
              placeholder="Organization Code * (e.g., ABC001)"
              value={formData.organizationCode}
              onChangeText={(value) => updateFormData('organizationCode', value)}
              style={styles.input}
              autoCapitalize="characters"
              placeholderTextColor="#999"
            />
          </View>

          {/* Admin Details */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 }}>
              Admin Details
            </Text>
            
            <TextInput
              placeholder="Admin Name *"
              value={formData.adminName}
              onChangeText={(value) => updateFormData('adminName', value)}
              style={styles.input}
              placeholderTextColor="#999"
            />

            <TextInput
              placeholder="Admin Email *"
              value={formData.adminEmail}
              onChangeText={(value) => updateFormData('adminEmail', value)}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TextInput
              placeholder="Password * (min 8 characters)"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#999"
            />

            <TextInput
              placeholder="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          {/* Campus Location (Optional) */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 }}>
              Campus Location (Optional)
            </Text>
            
            <TextInput
              placeholder="Campus Name"
              value={formData.campusLocation.name}
              onChangeText={(value) => updateFormData('campusLocation.name', value)}
              style={styles.input}
              placeholderTextColor="#999"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                placeholder="Latitude"
                value={formData.campusLocation.latitude}
                onChangeText={(value) => updateFormData('campusLocation.latitude', value)}
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <TextInput
                placeholder="Longitude"
                value={formData.campusLocation.longitude}
                onChangeText={(value) => updateFormData('campusLocation.longitude', value)}
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register Organization</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={{ marginTop: 20, alignItems: 'center' }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: '#666' }}>
              Already have an account?{' '}
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
};