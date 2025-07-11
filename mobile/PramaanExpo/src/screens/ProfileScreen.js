// mobile/PramaanExpo/src/screens/ProfileScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, Avatar, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export const ProfileScreen = ({ navigation }) => {
  const { user, userType, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Icon size={80} icon="account" style={styles.avatar} />
            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            <Text style={styles.role}>{userType?.toUpperCase()}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <List.Section>
            <List.Subheader>Account Information</List.Subheader>
            <List.Item
              title="Organization"
              description={user?.organizationName || 'Demo Organization'}
              left={(props) => <List.Icon {...props} icon="domain" />}
            />
            <Divider />
            <List.Item
              title="Role"
              description={userType}
              left={(props) => <List.Icon {...props} icon="account-key" />}
            />
          </List.Section>
        </Card>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={20} color="#FF5252" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// mobile/PramaanExpo/src/screens/SettingsScreen.js
export const SettingsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        <Card style={styles.settingsCard}>
          <List.Section>
            <List.Subheader>Organization Settings</List.Subheader>
            <List.Item
              title="Campus Boundaries"
              description="Set geofencing boundaries"
              left={(props) => <List.Icon {...props} icon="map-marker" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Working Hours"
              description="Configure attendance timings"
              left={(props) => <List.Icon {...props} icon="clock" />}
              onPress={() => {}}
            />
          </List.Section>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

// mobile/PramaanExpo/src/screens/ReportsScreen.js
export const ReportsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.centerContent}>
        <Icon name="insert-chart" size={64} color="#E0E0E0" />
        <Text style={styles.emptyText}>Reports coming soon</Text>
      </View>
    </SafeAreaView>
  );
};

// mobile/PramaanExpo/src/screens/VerifyProofScreen.js
export const VerifyProofScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Proof</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.centerContent}>
        <Icon name="qr-code-scanner" size={64} color="#E0E0E0" />
        <Text style={styles.emptyText}>Proof verification coming soon</Text>
      </View>
    </SafeAreaView>
  );
};

// mobile/PramaanExpo/src/screens/DownloadReportScreen.js
export const DownloadReportScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.centerContent}>
        <Icon name="download" size={64} color="#E0E0E0" />
        <Text style={styles.emptyText}>Report download coming soon</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
    elevation: 3,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: '#6C63FF',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  role: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF5252',
    fontWeight: '600',
  },
  settingsCard: {
    margin: 16,
    elevation: 2,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
});

// Export default screens
export default ProfileScreen;