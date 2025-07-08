<<<<<<< Updated upstream
﻿import React from 'react';
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
=======
import React from 'react';
import TestScreen from './TestScreen';
>>>>>>> Stashed changes
export default function App() {
  return <TestScreen />;
}
