// Step 1: Fix App.js - Remove NavigationContainer from here
// mobile/PramaanExpo/App.js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { LogBox } from 'react-native';

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Create a complete theme configuration
const theme = {
  ...DefaultTheme,
  roundness: 2,
  version: 3,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6C63FF',
    secondary: '#FF6B6B',
    tertiary: '#03dac6',
    quaternary: '#018786',
    surface: '#ffffff',
    background: '#f6f6f6',
    error: '#B00020',
    onPrimary: '#ffffff',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#ffffff',
    text: '#000000',
    disabled: 'rgba(0, 0, 0, 0.26)',
    placeholder: 'rgba(0, 0, 0, 0.54)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#f50057',
    // These are the properties that Dialog might be looking for
    surfaceVariant: '#e0e0e0',
    onSurfaceVariant: '#000000',
    outline: '#737373',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
