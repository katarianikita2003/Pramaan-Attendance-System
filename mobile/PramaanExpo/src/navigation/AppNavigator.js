// mobile/PramaanExpo/src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';

// Import multiple screens from ProfileScreen file
import ProfileScreen, { 
  ReportsScreen, 
  SettingsScreen, 
  VerifyProofScreen, 
  DownloadReportScreen 
} from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, userType, loading } = useAuth();

  if (loading) {
    // Show loading screen while checking auth status
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
            />
            <Stack.Screen 
              name="RegisterOrganization" 
              component={RegisterOrganizationScreen} 
            />
          </>
        ) : (
          // Authenticated Stack
          <>
            {userType === 'admin' ? (
              // Admin Stack
              <>
                <Stack.Screen 
                  name="AdminDashboard" 
                  component={AdminDashboardScreen} 
                />
                <Stack.Screen 
                  name="AddScholar" 
                  component={AddScholarScreen} 
                />
                <Stack.Screen 
                  name="Reports" 
                  component={ReportsScreen} 
                />
                <Stack.Screen 
                  name="Settings" 
                  component={SettingsScreen} 
                />
                <Stack.Screen 
                  name="Profile" 
                  component={ProfileScreen} 
                />
                <Stack.Screen 
                  name="VerifyProof" 
                  component={VerifyProofScreen} 
                />
              </>
            ) : (
              // Scholar Stack
              <>
                <Stack.Screen 
                  name="ScholarDashboard" 
                  component={ScholarDashboardScreen} 
                />
                <Stack.Screen 
                  name="MarkAttendance" 
                  component={AttendanceScreen} 
                />
                <Stack.Screen 
                  name="AttendanceHistory" 
                  component={AttendanceHistoryScreen} 
                />
                <Stack.Screen 
                  name="Profile" 
                  component={ProfileScreen} 
                />
                <Stack.Screen 
                  name="VerifyProof" 
                  component={VerifyProofScreen} 
                />
                <Stack.Screen 
                  name="DownloadReport" 
                  component={DownloadReportScreen} 
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;