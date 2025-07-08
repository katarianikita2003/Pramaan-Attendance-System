import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddScholarScreen() {
  return (
    <View style={styles.container}>
      <Text>Add Scholar Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
