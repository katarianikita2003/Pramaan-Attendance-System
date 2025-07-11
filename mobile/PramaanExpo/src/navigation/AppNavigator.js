// mobile/PramaanExpo/src/navigation/AppNavigator.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View, Text } from 'react-native';

// Import existing screens
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';

// Create WelcomeScreen component
const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', padding: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6C63FF', marginBottom: 10 }}>
          Pramaan
        </Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
          Zero-Knowledge Proof Attendance System
        </Text>
      </View>
      
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 20, elevation: 3 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>
          Organization Admin
        </Text>
        <Text style={{ color: '#666', textAlign: 'center', marginBottom: 20 }}>
          Register your organization or login to manage attendance
        </Text>
        <Text 
          style={{ 
            backgroundColor: '#6C63FF', 
            color: 'white', 
            padding: 15, 
            borderRadius: 8, 
            textAlign: 'center', 
            fontWeight: 'bold',
            marginBottom: 10
          }}
          onPress={() => navigation.navigate('RegisterOrganization')}
        >
          Register Organization
        </Text>
        <Text 
          style={{ 
            borderWidth: 1, 
            borderColor: '#6C63FF', 
            color: '#6C63FF', 
            padding: 15, 
            borderRadius: 8,
            textAlign: 'center', 
            fontWeight: 'bold'
          }}
          onPress={() => navigation.navigate('Login', { userType: 'admin' })}
        >
          Admin Login
        </Text>
      </View>

      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 3 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>
          Scholar/Student
        </Text>
        <Text style={{ color: '#666', textAlign: 'center', marginBottom: 20 }}>
          Login to mark attendance with biometric authentication
        </Text>
        <Text 
          style={{ 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            padding: 15, 
            borderRadius: 8,
            textAlign: 'center', 
            fontWeight: 'bold'
          }}
          onPress={() => navigation.navigate('Login', { userType: 'scholar' })}
        >
          Scholar Login
        </Text>
      </View>
    </View>
  );
};

// Placeholder screens
const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Profile Screen - Coming Soon</Text>
  </View>
);

const ReportsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Reports Screen - Coming Soon</Text>
  </View>
);

const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Settings Screen - Coming Soon</Text>
  </View>
);

const VerifyProofScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Verify Proof Screen - Coming Soon</Text>
  </View>
);

const DownloadReportScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Download Report Screen - Coming Soon</Text>
  </View>
);

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, userType, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Helper function to get initial route
  const getInitialRouteName = () => {
    if (isAuthenticated) {
      return userType === 'admin' ? 'AdminDashboard' : 'ScholarDashboard';
    }
    return 'Welcome';
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RegisterOrganization" component={RegisterOrganizationScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="ScholarDashboard" component={ScholarDashboardScreen} />
        <Stack.Screen name="AddScholar" component={AddScholarScreen} />
        <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />
        <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="VerifyProof" component={VerifyProofScreen} />
        <Stack.Screen name="DownloadReport" component={DownloadReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;