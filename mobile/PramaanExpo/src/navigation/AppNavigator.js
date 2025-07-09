// mobile/PramaanExpo/src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Additional screens for Scholar
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import VerifyProofScreen from '../screens/VerifyProofScreen';
import DownloadReportScreen from '../screens/DownloadReportScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, userType, loading } = useAuth();

  if (loading) {
    // You can return a loading screen here
    return null;
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
                  name="Profile" 
                  component={ProfileScreen} 
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