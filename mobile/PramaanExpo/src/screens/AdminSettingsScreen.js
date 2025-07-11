// 6. src/screens/AdminSettingsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const AdminSettingsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin Settings</Text>
        <Text style={styles.subtitle}>Coming Soon...</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.button}>
          Go Back
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  button: { marginTop: 20 },
});

export default AdminSettingsScreen;
