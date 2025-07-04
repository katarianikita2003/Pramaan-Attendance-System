// ===== mobile/src/navigation/AppNavigator.js =====
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Navigators
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import ScholarNavigator from './ScholarNavigator';

// Screens
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user?.role === 'admin' ? (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : (
        <Stack.Screen name="Scholar" component={ScholarNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;