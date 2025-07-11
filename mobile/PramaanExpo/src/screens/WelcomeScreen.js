// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  ImageBackground,
} from 'react-native';
import {
  Button,
  Text,
  Surface,
  Card,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}>
          <Surface style={styles.logoSurface}>
            <Icon name="fingerprint" size={80} color="#6C63FF" />
          </Surface>
          <Text style={styles.title}>Pramaan</Text>
          <Text style={styles.subtitle}>प्रमाण</Text>
          <Text style={styles.description}>
            Zero-Knowledge Proof Attendance System
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={[
          styles.featuresContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={styles.feature}>
            <Icon name="security" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Secure & Private</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="fingerprint" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Biometric Authentication</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="verified-user" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Zero-Knowledge Proof</Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Login
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('RegisterOrganization')}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.outlineButtonLabel}
          >
            Register Organization
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('VerifyProof')}
            style={styles.verifyButton}
            labelStyle={styles.textButtonLabel}
          >
            Verify Attendance Proof
          </Button>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure attendance tracking with biometric authentication
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoSurface: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#6C63FF',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 60,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  loginButton: {
    marginBottom: 16,
    borderRadius: 8,
  },
  registerButton: {
    marginBottom: 16,
    borderRadius: 8,
    borderColor: '#6C63FF',
  },
  verifyButton: {
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  textButtonLabel: {
    fontSize: 14,
    color: '#6C63FF',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default WelcomeScreen;