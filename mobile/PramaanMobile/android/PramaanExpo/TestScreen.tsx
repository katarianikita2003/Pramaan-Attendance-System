import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function TestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pramaan Attendance System</Text>
      <Text>ZKP-based Attendance</Text>
      <Text>Backend URL: http://10.179.83.32:5000</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
