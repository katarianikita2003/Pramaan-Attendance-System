import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

const Stack = createNativeStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Splash">
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RegisterOrg" component={RegisterOrgScreen} options={{ title: 'Register' }} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin' }} />
            <Stack.Screen name="ScholarDashboard" component={ScholarDashboard} options={{ title: 'Scholar' }} />
            <Stack.Screen name="AddScholar" component={AddScholarScreen} />
            <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
            <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;
