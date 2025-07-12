// mobile/PramaanExpo/src/navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AddScholarScreen from '../screens/AddScholarScreen';
import ScholarsListScreen from '../screens/ScholarsListScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScholarDashboardScreen from '../screens/ScholarDashboardScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import ScholarProfileScreen from '../screens/ScholarProfileScreen';
import VerificationScreen from '../screens/VerificationScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import BiometricSetupScreen from '../screens/BiometricSetupScreen';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1E3A8A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-check" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Scholars"
        component={ScholarsListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="file-document" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Scholar Tab Navigator
function ScholarTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1E3A8A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ScholarDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={AttendanceHistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ScholarProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Verification" component={VerificationScreen} />
        </>
      ) : user.userType === 'admin' ? (
        <>
          <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
          <Stack.Screen 
            name="AddScholar" 
            component={AddScholarScreen}
            options={{
              headerShown: true,
              headerTitle: 'Add New Scholar',
              headerStyle: {
                backgroundColor: '#1E3A8A',
              },
              headerTintColor: '#FFFFFF',
            }}
          />
          <Stack.Screen 
            name="ScholarProfile" 
            component={ScholarProfileScreen}
            options={{
              headerShown: true,
              headerTitle: 'Scholar Profile',
              headerStyle: {
                backgroundColor: '#1E3A8A',
              },
              headerTintColor: '#FFFFFF',
            }}
          />
          <Stack.Screen 
            name="AttendanceReport" 
            component={AttendanceReportScreen}
            options={{
              headerShown: true,
              headerTitle: 'Attendance Report',
              headerStyle: {
                backgroundColor: '#1E3A8A',
              },
              headerTintColor: '#FFFFFF',
            }}
          />
          <Stack.Screen 
            name="BiometricSetup" 
            component={BiometricSetupScreen}
            options={{
              headerShown: true,
              headerTitle: 'Biometric Setup',
              headerStyle: {
                backgroundColor: '#1E3A8A',
              },
              headerTintColor: '#FFFFFF',
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="ScholarTabs" component={ScholarTabNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}