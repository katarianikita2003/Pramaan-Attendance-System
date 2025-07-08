# Save this as complete-setup.ps1 and run it in mobile/PramaanMobile directory

# Create all screens with working code
$screens = @{
"src\screens\SplashScreen.tsx" = @'
import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('Welcome');
    }, 2000);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pramaan</Text>
      <Text style={styles.subtitle}>Zero-Knowledge Attendance</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
});

export default SplashScreen;
'@

"src\screens\WelcomeScreen.tsx" = @'
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';

const WelcomeScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Pramaan</Text>
      </View>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>For Organizations</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('RegisterOrg')}
              style={styles.button}
            >
              Register Organization
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Login', { role: 'admin' })}
              style={styles.button}
            >
              Admin Login
            </Button>
          </Card.Content>
        </Card>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>For Scholars</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login', { role: 'scholar' })}
              style={styles.button}
            >
              Scholar Login
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1976D2', padding: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  card: { marginBottom: 20, elevation: 4 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  button: { marginBottom: 10 },
});

export default WelcomeScreen;
'@

"src\screens\LoginScreen.tsx" = @'
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation, route }) => {
  const { role } = route.params || {};
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // For demo, accept any credentials
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      if (role === 'admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('ScholarDashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{role === 'admin' ? 'Admin Login' : 'Scholar Login'}</Title>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          >
            Login
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  card: { margin: 20, elevation: 4 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
});

export default LoginScreen;
'@

"src\screens\RegisterOrgScreen.tsx" = @'
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';

const RegisterOrgScreen = ({ navigation }) => {
  const [orgName, setOrgName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      // API call would go here
      Alert.alert('Success', 'Organization registered! Code: ORG123', [
        { text: 'OK', onPress: () => navigation.replace('AdminDashboard') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Register Organization</Title>
          <TextInput label="Organization Name" value={orgName} onChangeText={setOrgName} mode="outlined" style={styles.input} />
          <TextInput label="Admin Name" value={adminName} onChangeText={setAdminName} mode="outlined" style={styles.input} />
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined" style={styles.input} />
          <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={handleRegister} loading={loading} style={styles.button}>
            Register
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 20, elevation: 4 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
});

export default RegisterOrgScreen;
'@

"src\screens\AdminDashboard.tsx" = @'
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Text, Button } from 'react-native-paper';

const AdminDashboard = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Admin Dashboard</Title>
          <Text>Organization: Demo University</Text>
          <Text>Code: ORG123</Text>
        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <Button mode="contained" onPress={() => navigation.navigate('AddScholar')} style={styles.button}>
            Add Scholar
          </Button>
          <Button mode="outlined" onPress={() => navigation.navigate('AttendanceHistory')} style={styles.button}>
            View Attendance
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 15, elevation: 3 },
  button: { marginTop: 10 },
});

export default AdminDashboard;
'@

"src\screens\ScholarDashboard.tsx" = @'
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, Button } from 'react-native-paper';

const ScholarDashboard = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Scholar Dashboard</Title>
          <Text>Welcome, Student!</Text>
          <Text>Attendance: 85%</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('MarkAttendance')} 
            style={styles.button}
          >
            Mark Attendance
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  card: { elevation: 3 },
  button: { marginTop: 20 },
});

export default ScholarDashboard;
'@

"src\screens\AddScholarScreen.tsx" = @'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddScholarScreen() {
  return (
    <View style={styles.container}>
      <Text>Add Scholar Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
'@

"src\screens\MarkAttendanceScreen.tsx" = @'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MarkAttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text>Mark Attendance Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
'@

"src\screens\AttendanceHistoryScreen.tsx" = @'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AttendanceHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text>Attendance History Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
'@
}

# Create App.tsx with proper navigation
@'
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
'@ | Out-File -FilePath App.tsx -Encoding UTF8

# Create all screen files
foreach ($file in $screens.Keys) {
    $screens[$file] | Out-File -FilePath $file -Encoding UTF8
    Write-Host "Created $file" -ForegroundColor Green
}

Write-Host "`nAll files created! The app should work now." -ForegroundColor Green