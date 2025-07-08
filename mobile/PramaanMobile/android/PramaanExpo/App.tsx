import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterOrgScreen from './src/screens/RegisterOrgScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import ScholarDashboard from './src/screens/ScholarDashboard';
import MarkAttendanceScreen from './src/screens/MarkAttendanceScreen';
import AddScholarScreen from './src/screens/AddScholarScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
const Stack = createNativeStackNavigator();
export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Splash"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterOrg" component={RegisterOrgScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="ScholarDashboard" component={ScholarDashboard} />
            <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
            <Stack.Screen name="AddScholar" component={AddScholarScreen} />
            <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}