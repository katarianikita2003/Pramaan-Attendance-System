// App.js - Main Application Entry Point
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';

// Ignore specific warnings for cleaner development
LogBox.ignoreLogs([
  'Warning: componentWillReceiveProps',
  'Warning: componentWillMount',
  'VirtualizedLists should never be nested',
  'Setting a timer',
]);

// Custom theme for React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6C63FF',
    accent: '#FF6B6B',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#333333',
    placeholder: '#999999',
    disabled: '#CCCCCC',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF5722',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
  },
  roundness: 8,
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <AuthProvider>
          <LocationProvider>
            <StatusBar style="dark" backgroundColor="#6C63FF" />
            <AppNavigator />
          </LocationProvider>
        </AuthProvider>
      </NavigationContainer>
    </PaperProvider>
  );
}