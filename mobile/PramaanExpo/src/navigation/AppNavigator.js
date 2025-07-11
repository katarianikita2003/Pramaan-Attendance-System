// mobile/PramaanExpo/src/navigation/AppNavigator.js - FINAL WORKING VERSION
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View, Text } from 'react-native';

// Import ONLY screens that actually exist
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';

// Import individual screen files that exist
import ProfileScreen from '../screens/ProfileScreen';  // Default export only
import SettingsScreen from '../screens/SettingsScreen';  // Standalone file

// Create simple placeholder screens for missing files
const AttendanceScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Mark Attendance</Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Attendance marking screen will be available soon.
      </Text>
    </View>
  );
};

const AttendanceHistoryScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Attendance History</Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Attendance history screen will be available soon.
      </Text>
    </View>
  );
};

const ReportsScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Reports</Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Reports screen will be available soon.
      </Text>
    </View>
  );
};

const VerifyProofScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Verify Proof</Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Proof verification screen will be available soon.
      </Text>
    </View>
  );
};

const DownloadReportScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Download Report</Text>
      <Text style={{ textAlign: 'center', color: '#666' }}>
        Report download screen will be available soon.
      </Text>
    </View>
  );
};

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