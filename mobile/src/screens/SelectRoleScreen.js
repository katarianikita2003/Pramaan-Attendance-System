import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Title, Card } from 'react-native-paper';

const SelectRoleScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Title style={styles.title}>Pramaan Attendance System</Title>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Scholar Login</Title>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => navigation.navigate('Login', { role: 'scholar' })}>
            Login as Scholar
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Admin Login</Title>
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => navigation.navigate('Login', { role: 'admin' })}>
            Login as Admin
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    marginBottom: 15,
  },
});

export default SelectRoleScreen;