import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, List, Switch, Divider, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrganizationSettingsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [biometricOnly, setBiometricOnly] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>General Settings</Title>
            <List.Item
              title="Email Notifications"
              description="Receive attendance alerts"
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Auto-approve Scholars"
              description="Automatically approve new registrations"
              right={() => (
                <Switch
                  value={autoApprove}
                  onValueChange={setAutoApprove}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Security Settings</Title>
            <List.Item
              title="Biometric Only"
              description="Require biometric for attendance"
              right={() => (
                <Switch
                  value={biometricOnly}
                  onValueChange={setBiometricOnly}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Campus Boundaries</Title>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('UpdateBoundaries')}
              style={styles.button}
            >
              Update Location Boundaries
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  button: {
    marginTop: 8,
  },
});