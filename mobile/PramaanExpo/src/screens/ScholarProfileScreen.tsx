import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, List, Avatar, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScholarProfileScreen({ navigation }) {
  // Get scholar data from AsyncStorage or context
  const scholarData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    scholarId: 'SCH001',
    department: 'Computer Science',
    year: '3rd Year',
    organizationCode: 'ORG123',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarContainer}>
          <Avatar.Text size={80} label={scholarData.name.charAt(0)} />
          <Title style={styles.name}>{scholarData.name}</Title>
          <Text style={styles.scholarId}>{scholarData.scholarId}</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Personal Information</Title>
            <List.Item
              title="Email"
              description={scholarData.email}
              left={() => <List.Icon icon="email" />}
            />
            <Divider />
            <List.Item
              title="Department"
              description={scholarData.department}
              left={() => <List.Icon icon="school" />}
            />
            <Divider />
            <List.Item
              title="Year"
              description={scholarData.year}
              left={() => <List.Icon icon="calendar" />}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Organization</Title>
            <List.Item
              title="Organization Code"
              description={scholarData.organizationCode}
              left={() => <List.Icon icon="domain" />}
            />
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    marginTop: 12,
    fontSize: 24,
  },
  scholarId: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
});