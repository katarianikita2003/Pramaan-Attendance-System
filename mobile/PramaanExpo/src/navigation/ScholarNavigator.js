// navigation/ScholarNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import ScholarDashboard from '../screens/ScholarDashboardScreen';
import MarkAttendanceScreen from '../screens/MarkAttendanceScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AttendanceProofScreen from '../screens/AttendanceProofScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Bottom Tab Navigator
const ScholarTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MarkAttendance') {
            iconName = focused ? 'finger-print' : 'finger-print-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontSize: 12,
        },
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={ScholarDashboard}
        options={{ 
          title: 'Dashboard',
          headerShown: false,
        }} 
      />
      <Tab.Screen 
        name="MarkAttendance" 
        component={MarkAttendanceScreen}
        options={{ 
          title: 'Mark',
          headerShown: false,
        }} 
      />
      <Tab.Screen 
        name="History" 
        component={AttendanceHistoryScreen}
        options={{ 
          title: 'History',
          headerShown: false,
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerShown: false,
        }} 
      />
    </Tab.Navigator>
  );
};

// Main Scholar Navigator with Stack
const ScholarNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200EE',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="ScholarTabs" 
        component={ScholarTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AttendanceProof" 
        component={AttendanceProofScreen}
        options={{ 
          title: 'Attendance Proof',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default ScholarNavigator;