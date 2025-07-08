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
