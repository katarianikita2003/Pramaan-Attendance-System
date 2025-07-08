import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AttendanceProvider } from './src/contexts/AttendanceContext';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterOrgScreen from './src/screens/RegisterOrgScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import ScholarDashboard from './src/screens/ScholarDashboard';
import AddScholarScreen from './src/screens/AddScholarScreen';
import MarkAttendanceScreen from './src/screens/MarkAttendanceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';

// Import services
import biometricService from './src/services/biometric';
import offlineService from './src/services/offline';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <SplashScreen navigation={null} />;
  }

  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="RegisterOrg" component={RegisterOrgScreen} options={{ title: 'Register' }} />
        </>
      ) : (
        <>
          {user?.role === 'admin' ? (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin Dashboard' }} />
              <Stack.Screen name="AddScholar" component={AddScholarScreen} options={{ title: 'Add Scholar' }} />
              <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ title: 'Attendance History' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="ScholarDashboard" component={ScholarDashboard} options={{ title: 'Dashboard' }} />
              <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} options={{ title: 'Mark Attendance' }} />
              <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ title: 'My Attendance' }} />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

function App() {
  useEffect(() => {
    // Initialize services
    initializeApp();
    
    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Sync offline data when connection is restored
        syncOfflineData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize biometric service
      await biometricService.initialize();
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  const syncOfflineData = async () => {
    try {
      const pendingRecords = await offlineService.getPendingAttendance();
      
      if (pendingRecords.length > 0) {
        Alert.alert(
          'Offline Data',
          `You have ${pendingRecords.length} attendance records to sync. Sync now?`,
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Sync', 
              onPress: async () => {
                // This will be handled by AttendanceContext
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking offline data:', error);
    }
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <AttendanceProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </AttendanceProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;