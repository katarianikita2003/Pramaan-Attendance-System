// mobile/PramaanExpo/src/screens/SettingsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  List,
  Switch,
  Divider,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const SettingsScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const initialTab = route.params?.tab;
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });
  const [security, setSecurity] = useState({
    biometric: true,
    twoFactor: false,
  });

  const handleSave = () => {
    Alert.alert('Success', 'Settings saved successfully');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Organization Settings */}
        <Card style={styles.section}>
          <Card.Title title="Organization Settings" />
          <Card.Content>
            <List.Item
              title="Organization Name"
              description="Test Organization"
              left={(props) => <List.Icon {...props} icon="business" />}
              right={() => <Icon name="chevron-right" size={24} color="#666" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Campus Boundaries"
              description="Set geofencing radius"
              left={(props) => <List.Icon {...props} icon="map-marker-radius" />}
              right={() => <Icon name="chevron-right" size={24} color="#666" />}
              onPress={() => Alert.alert('Info', 'Campus boundaries configuration')}
            />
            <Divider />
            <List.Item
              title="Working Hours"
              description="9:00 AM - 6:00 PM"
              left={(props) => <List.Icon {...props} icon="clock-outline" />}
              right={() => <Icon name="chevron-right" size={24} color="#666" />}
              onPress={() => {}}
            />
          </Card.Content>
        </Card>

        {/* Notification Settings */}
        <Card style={styles.section}>
          <Card.Title title="Notifications" />
          <Card.Content>
            <List.Item
              title="Email Notifications"
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => (
                <Switch
                  value={notifications.email}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, email: value })
                  }
                />
              )}
            />
            <Divider />
            <List.Item
              title="Push Notifications"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notifications.push}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, push: value })
                  }
                />
              )}
            />
            <Divider />
            <List.Item
              title="SMS Notifications"
              left={(props) => <List.Icon {...props} icon="message-text" />}
              right={() => (
                <Switch
                  value={notifications.sms}
                  onValueChange={(value) =>
                    setNotifications({ ...notifications, sms: value })
                  }
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Security Settings */}
        <Card style={styles.section}>
          <Card.Title title="Security" />
          <Card.Content>
            <List.Item
              title="Biometric Authentication"
              description="Use fingerprint or face for login"
              left={(props) => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={security.biometric}
                  onValueChange={(value) =>
                    setSecurity({ ...security, biometric: value })
                  }
                />
              )}
            />
            <Divider />
            <List.Item
              title="Two-Factor Authentication"
              left={(props) => <List.Icon {...props} icon="shield-lock" />}
              right={() => (
                <Switch
                  value={security.twoFactor}
                  onValueChange={(value) =>
                    setSecurity({ ...security, twoFactor: value })
                  }
                />
              )}
            />
            <Divider />
            <List.Item
              title="Change Password"
              left={(props) => <List.Icon {...props} icon="lock-reset" />}
              right={() => <Icon name="chevron-right" size={24} color="#666" />}
              onPress={() => Alert.alert('Info', 'Change password functionality')}
            />
          </Card.Content>
        </Card>

        {/* About */}
        <Card style={styles.section}>
          <Card.Title title="About" />
          <Card.Content>
            <List.Item
              title="Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <Divider />
            <List.Item
              title="Terms of Service"
              left={(props) => <List.Icon {...props} icon="file-document" />}
              right={() => <Icon name="chevron-right" size={24} color="#666" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="shield-check" />}
              right={() => <Icon name="chevron-right" size={24} color="#666" />}
              onPress={() => {}}
            />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          Save Settings
        </Button>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  saveButton: {
    margin: 16,
    marginBottom: 32,
  },
});

export default SettingsScreen;