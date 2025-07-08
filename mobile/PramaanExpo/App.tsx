import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import screens
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
// Custom theme for Pramaan
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6C63FF',
    accent: '#FF6B6B',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#2C3E50',
  },
  roundness: 8,
};
export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.colors.primary,
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Splash" 
              component={SplashScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Welcome" 
              component={WelcomeScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ title: 'Login' }} 
            />
            <Stack.Screen 
              name="RegisterOrg" 
              component={RegisterOrgScreen} 
              options={{ title: 'Register Organization' }} 
            />
            <Stack.Screen 
              name="AdminDashboard" 
              component={AdminDashboard} 
              options={{ title: 'Admin Dashboard' }} 
            />
            <Stack.Screen 
              name="ScholarDashboard" 
              component={ScholarDashboard} 
              options={{ title: 'Scholar Dashboard' }} 
            />
            <Stack.Screen 
              name="MarkAttendance" 
              component={MarkAttendanceScreen} 
              options={{ title: 'Mark Attendance' }} 
            />
            <Stack.Screen 
              name="AddScholar" 
              component={AddScholarScreen} 
              options={{ title: 'Add Scholar' }} 
            />
            <Stack.Screen 
              name="AttendanceHistory" 
              component={AttendanceHistoryScreen} 
              options={{ title: 'Attendance History' }} 
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
