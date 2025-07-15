// mobile/PramaanExpo/src/navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterOrganizationScreen from '../screens/RegisterOrganizationScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';
import BiometricEnrollmentScreen from '../screens/scholar/BiometricEnrollmentScreen';

// Import new ZKP screens with proper error handling
let AttendanceScreen;
try {
  AttendanceScreen = require('../screens/scholar/AttendanceScreen').default;
} catch (e) {
  console.log('AttendanceScreen not found, using placeholder');
  AttendanceScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Attendance Screen</Text>
    </View>
  );
}

// Mock QR Scanner for Expo Go
const QRScannerScreen = ({ navigation }) => {
  const [verifying, setVerifying] = React.useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <View style={{ backgroundColor: '#3B82F6', paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>QR Scanner (Mock)</Text>
      </View>
      <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          Camera not available in Expo Go.{'\n'}
          Use development build for QR scanning.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: '#3B82F6', padding: 15, borderRadius: 10 }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Check if these screens exist, otherwise use placeholders
let AttendanceHistoryScreen, ProfileScreen;
let ReportsScreen, SettingsScreen, VerifyProofScreen, DownloadReportScreen;
let ScholarsListScreen, AttendanceReportScreen;

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
            name="BiometricEnrollment"
            component={BiometricEnrollmentScreen}
            options={{ title: 'Biometric Enrollment' }}
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
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              title: 'Scan QR Code',
              headerShown: false
            }}
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
            name="BiometricEnrollment"
            component={BiometricEnrollmentScreen}
            options={{ 
              title: 'Biometric Enrollment',
              headerStyle: {
                backgroundColor: '#6C63FF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen
            name="MarkAttendance"
            component={AttendanceScreen}
            options={{
              title: 'Mark Attendance',
              headerStyle: {
                backgroundColor: '#3B82F6',
              },
            }}
          />
          <Stack.Screen
            name="Attendance"
            component={AttendanceScreen}
            options={{
              title: 'Mark Attendance',
              headerStyle: {
                backgroundColor: '#3B82F6',
              },
            }}
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
  );
};

export default AppNavigator;