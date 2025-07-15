
// mobile/PramaanExpo/App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import { PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Warning: Failed prop type',
  'Non-serializable values were found',
  'Cannot find native module',
  'ExpoBarCodeScanner'
]);

// Import AppNavigator
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

// // mobile/PramaanExpo/App.js
// import 'react-native-gesture-handler';
// import React, { useEffect, useState } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
// import { StatusBar } from 'expo-status-bar';
// import { ActivityIndicator, View } from 'react-native';
// import * as Font from 'expo-font';
// import AppNavigator from './src/navigation/AppNavigator';
// import { AuthProvider } from './src/contexts/AuthContext';

// // Define theme without portal property
// const theme = {
//   ...DefaultTheme,
//   colors: {
//     ...DefaultTheme.colors,
//     primary: '#1E3A8A',
//     accent: '#F59E0B',
//   },
// };

// export default function App() {
//   const [fontsLoaded, setFontsLoaded] = useState(false);

//   useEffect(() => {
//     async function loadFonts() {
//       try {
//         await Font.loadAsync({
//           'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
//         });
//         setFontsLoaded(true);
//       } catch (error) {
//         console.error('Error loading fonts:', error);
//         setFontsLoaded(true); // Continue anyway
//       }
//     }
//     loadFonts();
//   }, []);

//   if (!fontsLoaded) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <AuthProvider>
//       <PaperProvider theme={theme}>
//         <NavigationContainer>
//           <StatusBar style="auto" />
//           <AppNavigator />
//         </NavigationContainer>
//       </PaperProvider>
//     </AuthProvider>
//   );
// }