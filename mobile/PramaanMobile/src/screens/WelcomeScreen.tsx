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
