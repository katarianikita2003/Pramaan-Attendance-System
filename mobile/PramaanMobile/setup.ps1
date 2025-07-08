# Run this in mobile/PramaanMobile directory
# This script creates all necessary files with minimal working code

# Create directories
$dirs = @("src", "src\screens", "src\services")
foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Create a working App.tsx with minimal imports
@'
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, Button, StyleSheet } from 'react-native';

// Temporary screens
const TempScreen = ({ route, navigation }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{route.name} Screen</Text>
    <Button title="Go to Welcome" onPress={() => navigation.navigate('Welcome')} />
  </View>
);

const Stack = createNativeStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Welcome">
            <Stack.Screen name="Welcome" component={TempScreen} />
            <Stack.Screen name="Login" component={TempScreen} />
            <Stack.Screen name="RegisterOrg" component={TempScreen} />
            <Stack.Screen name="AdminDashboard" component={TempScreen} />
            <Stack.Screen name="ScholarDashboard" component={TempScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default App;
'@ | Out-File -FilePath App.tsx -Encoding UTF8

Write-Host "Created minimal App.tsx" -ForegroundColor Green

# Create minimal API service
@'
class ApiService {
  async adminLogin(email, password) {
    try {
      const response = await fetch('http://10.0.2.2:5000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  async registerOrganization(data) {
    try {
      const response = await fetch('http://10.0.2.2:5000/api/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

export default new ApiService();
'@ | Out-File -FilePath src\services\api.ts -Encoding UTF8

Write-Host "Created API service" -ForegroundColor Green
Write-Host "`nMinimal setup complete! Try running the app now." -ForegroundColor Yellow