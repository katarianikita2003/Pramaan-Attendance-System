import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import your screens
import SplashScreen from '../../../PramaanExpo/src/screens/SplashScreen';
import WelcomeScreen from '../../../PramaanExpo/src/screens/WelcomeScreen';
import LoginScreen from '../../../PramaanExpo/src/screens/LoginScreen';
import RegisterOrgScreen from '../../../PramaanExpo/src/screens/RegisterOrgScreen';
import AdminDashboard from '../../../PramaanExpo/src/screens/AdminDashboard';
import ScholarDashboard from '../../../PramaanExpo/src/screens/ScholarDashboard';
import MarkAttendanceScreen from '../../../PramaanExpo/src/screens/MarkAttendanceScreen';
import AddScholarScreen from '../../../PramaanExpo/src/screens/AddScholarScreen';
import AttendanceHistoryScreen from '../../../PramaanExpo/src/screens/AttendanceHistoryScreen';
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