// src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Auth Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminScholarsScreen from '../screens/AdminScholarsScreen';
import AddScholarScreen from '../screens/AddScholarScreen';
import ScholarDetailsScreen from '../screens/ScholarDetailsScreen';
import AdminReportsScreen from '../screens/AdminReportsScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import OrganizationSettingsScreen from '../screens/OrganizationSettingsScreen';

// Scholar Screens
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import ScholarProfileScreen from '../screens/ScholarProfileScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import BiometricEnrollmentScreen from '../screens/BiometricEnrollmentScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import ProofDownloadScreen from '../screens/ProofDownloadScreen';

// Shared Screens
import VerifyProofScreen from '../screens/VerifyProofScreen';
import QRScannerScreen from '../screens/QRScannerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Loading Component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
    <ActivityIndicator size="large" color="#6C63FF" />
  </View>
);

// Admin Tab Navigator
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Scholars') {
            iconName = 'group';
          } else if (route.name === 'Reports') {
            iconName = 'assessment';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e0e0e0',
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Scholars" component={AdminScholarsScreen} />
      <Tab.Screen name="Reports" component={AdminReportsScreen} />
      <Tab.Screen name="Settings" component={AdminSettingsScreen} />
    </Tab.Navigator>
  );
};

// Scholar Tab Navigator
const ScholarTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Attendance') {
            iconName = 'fingerprint';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e0e0e0',
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ScholarDashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="History" component={AttendanceHistoryScreen} />
      <Tab.Screen name="Profile" component={ScholarProfileScreen} />
    </Tab.Navigator>
  );
};

// Auth Stack Navigator
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterOrganization" component={RegisterOrganizationScreen} />
      <Stack.Screen name="VerifyProof" component={VerifyProofScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
};

// Admin Stack Navigator
const AdminStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      <Stack.Screen name="AddScholar" component={AddScholarScreen} />
      <Stack.Screen name="ScholarDetails" component={ScholarDetailsScreen} />
      <Stack.Screen name="OrganizationSettings" component={OrganizationSettingsScreen} />
      <Stack.Screen name="VerifyProof" component={VerifyProofScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
};

// Scholar Stack Navigator
const ScholarStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen name="ScholarTabs" component={ScholarTabNavigator} />
      <Stack.Screen name="BiometricEnrollment" component={BiometricEnrollmentScreen} />
      <Stack.Screen name="ProofDownload" component={ProofDownloadScreen} />
      <Stack.Screen name="VerifyProof" component={VerifyProofScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading, userType } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
      ) : userType === 'admin' ? (
        <Stack.Screen name="Admin" component={AdminStackNavigator} />
      ) : (
        <Stack.Screen name="Scholar" component={ScholarStackNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;