// mobile/PramaanExpo/src/navigation/AppNavigator.js
import React from 'react';
// REMOVED: import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View, Text } from 'react-native';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';

// Check if these screens exist, otherwise use placeholders
let AttendanceScreen, AttendanceHistoryScreen, ProfileScreen;
let ReportsScreen, SettingsScreen, VerifyProofScreen, DownloadReportScreen;
let ScholarsListScreen, AttendanceReportScreen;

try {
  AttendanceScreen = require('../screens/AttendanceScreen').default;
} catch { AttendanceScreen = null; }

try {
  AttendanceHistoryScreen = require('../screens/AttendanceHistoryScreen').default;
} catch { AttendanceHistoryScreen = null; }

try {
  ScholarsListScreen = require('../screens/ScholarsListScreen').default;
} catch { ScholarsListScreen = null; }

try {
  AttendanceReportScreen = require('../screens/AttendanceReportScreen').default;
} catch { AttendanceReportScreen = null; }

try {
  const ProfileModule = require('../screens/ProfileScreen');
  ProfileScreen = ProfileModule.default;
  ReportsScreen = ProfileModule.ReportsScreen;
  SettingsScreen = ProfileModule.SettingsScreen;
  VerifyProofScreen = ProfileModule.VerifyProofScreen;
  DownloadReportScreen = ProfileModule.DownloadReportScreen;
} catch {
  ProfileScreen = null;
  ReportsScreen = null;
  SettingsScreen = null;
  VerifyProofScreen = null;
  DownloadReportScreen = null;
}

// Placeholder screen for unimplemented features
const PlaceholderScreen = ({ route }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, color: '#666' }}>
        {route.name} Screen
      </Text>
      <Text style={{ fontSize: 14, color: '#999', marginTop: 8 }}>
        Coming Soon...
      </Text>
    </View>
  );
};

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

  // REMOVED <NavigationContainer> - returning Stack.Navigator directly
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6C63FF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="RegisterOrganization" 
            component={RegisterOrganizationScreen} 
            options={{ 
              title: 'Register Organization',
              headerShown: true 
            }}
          />
        </>
      ) : userType === 'admin' ? (
        // Admin Stack
        <>
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboardScreen}
            options={{ title: 'Admin Dashboard' }}
          />
          <Stack.Screen 
            name="AddScholar" 
            component={AddScholarScreen}
            options={{ title: 'Add Scholar' }}
          />
          <Stack.Screen 
            name="ScholarsList" 
            component={ScholarsListScreen || PlaceholderScreen}
            options={{ title: 'Scholars' }}
          />
          <Stack.Screen 
            name="AttendanceReport" 
            component={AttendanceReportScreen || PlaceholderScreen}
            options={{ title: 'Attendance Report' }}
          />
          <Stack.Screen 
            name="Reports" 
            component={ReportsScreen || PlaceholderScreen}
            options={{ title: 'Reports' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen || PlaceholderScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen || PlaceholderScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen 
            name="VerifyProof" 
            component={VerifyProofScreen || PlaceholderScreen}
            options={{ title: 'Verify Proof' }}
          />
        </>
      ) : userType === 'scholar' ? (
        // Scholar Stack
        <>
          <Stack.Screen 
            name="ScholarDashboard" 
            component={ScholarDashboardScreen}
            options={{ 
              title: 'Scholar Dashboard',
              headerShown: false 
            }}
          />
          <Stack.Screen 
            name="MarkAttendance" 
            component={AttendanceScreen || PlaceholderScreen}
            options={{ title: 'Mark Attendance' }}
          />
          <Stack.Screen 
            name="AttendanceHistory" 
            component={AttendanceHistoryScreen || PlaceholderScreen}
            options={{ title: 'Attendance History' }}
          />
          <Stack.Screen 
            name="ScholarProfile" 
            component={ProfileScreen || PlaceholderScreen}
            options={{ title: 'My Profile' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen || PlaceholderScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen 
            name="VerifyProof" 
            component={VerifyProofScreen || PlaceholderScreen}
            options={{ title: 'Verify Proof' }}
          />
          <Stack.Screen 
            name="DownloadReport" 
            component={DownloadReportScreen || PlaceholderScreen}
            options={{ title: 'Download Report' }}
          />
        </>
      ) : null}
    </Stack.Navigator>
    // REMOVED </NavigationContainer>
  );
};

export default AppNavigator;