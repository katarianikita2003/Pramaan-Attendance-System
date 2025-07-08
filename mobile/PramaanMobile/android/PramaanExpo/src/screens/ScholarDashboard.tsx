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
