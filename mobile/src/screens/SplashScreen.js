// ===== mobile/src/screens/SplashScreen.js =====
import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import {
  Title,
  Paragraph,
  ActivityIndicator
} from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1);
    opacity.value = withSequence(
      withDelay(300, withSpring(1)),
      withDelay(1500, withSpring(0.8))
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      
      <Title style={styles.title}>Pramaan</Title>
      <Paragraph style={styles.subtitle}>
        Zero-Knowledge Attendance System
      </Paragraph>
      
      <ActivityIndicator
        size="large"
        color="#6200ee"
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen;
