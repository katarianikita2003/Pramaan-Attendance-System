// mobile/PramaanExpo/src/screens/ScholarRegistrationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  RadioButton,
  HelperText,
  Checkbox,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const ScholarRegistrationScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Organization verification
  const [orgCode, setOrgCode] = useState('');
  const [orgVerified, setOrgVerified] = useState(false);
  const [orgData, setOrgData] = useState(null);
  
  // Personal information
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: '',
    scholarId: '',
  });
  
  // Academic information
  const [academicInfo, setAcademicInfo] = useState({
    department: '',
    course: '',
    year: '',
    section: '',
  });
  
  // Authentication
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState({});

  const verifyOrganization = async () => {
    if (!orgCode.trim()) {
      Alert.alert('Error', 'Please enter organization code');
      return;
    }

    try {
      setLoading(true);
      // API call to verify organization code
      const response = await fetch(`${API_BASE_URL}/organization/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: orgCode.trim().toUpperCase() })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOrgData(result.organization);
        setOrgVerified(true);
        setStep(2);
      } else {
        Alert.alert('Invalid Code', 'Organization code not found');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify organization code');
    } finally {
      setLoading(false);
    }
  };

  const validatePersonalInfo = () => {
    const newErrors = {};
    
    if (!personalInfo.name.trim()) newErrors.name = 'Name is required';
    if (!personalInfo.email.trim()) newErrors.email = 'Email is required';
    if (!personalInfo.phone.trim()) newErrors.phone = 'Phone is required';
    if (!personalInfo.scholarId.trim()) newErrors.scholarId = 'Scholar ID is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const proceedToBiometric = () => {
    if (validatePersonalInfo()) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters');
        return;
      }
      
      // Navigate to biometric enrollment with all data
      navigation.navigate('BiometricEnrollment', {
        orgData,
        personalInfo,
        academicInfo,
        password,
      });
    }
  };

  const renderStep1 = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.stepTitle}>Step 1: Verify Organization</Text>
        <Text style={styles.stepDescription}>
          Enter the organization code provided by your admin
        </Text>
        
        <TextInput
          label="Organization Code"
          value={orgCode}
          onChangeText={setOrgCode}
          style={styles.input}
          mode="outlined"
          autoCapitalize="characters"
          placeholder="Enter organization code"
        />
        
        <Button
          mode="contained"
          onPress={verifyOrganization}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Verify Organization
        </Button>
      </Card.Content>
    </Card>
  );

  const renderStep2 = () => (
    <ScrollView>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.stepTitle}>Step 2: Personal Information</Text>
          <Text style={styles.orgInfo}>Organization: {orgData?.name}</Text>
          
          <TextInput
            label="Full Name *"
            value={personalInfo.name}
            onChangeText={(text) => setPersonalInfo({...personalInfo, name: text})}
            style={styles.input}
            mode="outlined"
            error={!!errors.name}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>
          
          <TextInput
            label="Email *"
            value={personalInfo.email}
            onChangeText={(text) => setPersonalInfo({...personalInfo, email: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="email-address"
            error={!!errors.email}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>
          
          <TextInput
            label="Phone Number *"
            value={personalInfo.phone}
            onChangeText={(text) => setPersonalInfo({...personalInfo, phone: text})}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
            error={!!errors.phone}
          />
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>
          
          <TextInput
            label="Scholar/Student ID *"
            value={personalInfo.scholarId}
            onChangeText={(text) => setPersonalInfo({...personalInfo, scholarId: text})}
            style={styles.input}
            mode="outlined"
            error={!!errors.scholarId}
          />
          <HelperText type="error" visible={!!errors.scholarId}>
            {errors.scholarId}
          </HelperText>
          
          <Text style={styles.sectionTitle}>Academic Information</Text>
          
          <TextInput
            label="Department"
            value={academicInfo.department}
            onChangeText={(text) => setAcademicInfo({...academicInfo, department: text})}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Course"
            value={academicInfo.course}
            onChangeText={(text) => setAcademicInfo({...academicInfo, course: text})}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.row}>
            <TextInput
              label="Year"
              value={academicInfo.year}
              onChangeText={(text) => setAcademicInfo({...academicInfo, year: text})}
              style={[styles.input, styles.halfInput]}
              mode="outlined"
            />
            <TextInput
              label="Section"
              value={academicInfo.section}
              onChangeText={(text) => setAcademicInfo({...academicInfo, section: text})}
              style={[styles.input, styles.halfInput]}
              mode="outlined"
            />
          </View>
          
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TextInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
            secureTextEntry
          />
          
          <TextInput
            label="Confirm Password *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            mode="outlined"
            secureTextEntry
          />
          
          <Button
            mode="contained"
            onPress={proceedToBiometric}
            style={styles.button}
          >
            Proceed to Biometric Enrollment
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Icon 
          name="arrow-back" 
          size={24} 
          color="#333" 
          onPress={() => navigation.goBack()} 
        />
        <Text style={styles.headerTitle}>Scholar Registration</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {!orgVerified ? renderStep1() : renderStep2()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    margin: 20,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  orgInfo: {
    fontSize: 16,
    color: '#6C63FF',
    marginBottom: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
});

export default ScholarRegistrationScreen;