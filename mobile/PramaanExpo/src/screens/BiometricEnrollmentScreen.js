// src/screens/BiometricEnrollmentScreen.js - Complete Biometric Registration
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import {
  Card,
  Button,
  Text,
  ActivityIndicator,
  ProgressBar,
  Surface,
  Portal,
  Modal,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import biometricService from '../services/biometricService';
import zkpService from '../services/zkpService';

const { width, height } = Dimensions.get('window');

const ENROLLMENT_STEPS = [
  {
    id: 1,
    title: 'Device Check',
    description: 'Verifying biometric capabilities',
    icon: 'smartphone',
  },
  {
    id: 2,
    title: 'Face Capture',
    description: 'Capture your face for recognition',
    icon: 'face',
  },
  {
    id: 3,
    title: 'Liveness Detection',
    description: 'Verify you are not using a photo',
    icon: 'visibility',
  },
  {
    id: 4,
    title: 'Fingerprint Capture',
    description: 'Scan your fingerprint',
    icon: 'fingerprint',
  },
  {
    id: 5,
    title: 'ZKP Generation',
    description: 'Creating cryptographic commitment',
    icon: 'security',
  },
  {
    id: 6,
    title: 'Registration',
    description: 'Registering with secure backend',
    icon: 'cloud-upload',
  },
];

const BiometricEnrollmentScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState({
    deviceCapabilities: null,
    faceData: null,
    fingerprintData: null,
    livenessResult: null,
    commitment: null,
  });
  const [showInstructions, setShowInstructions] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const [error, setError] = useState(null);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkExistingEnrollment();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / ENROLLMENT_STEPS.length,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkExistingEnrollment = async () => {
    try {
      const enrolled = await biometricService.isBiometricEnrolled();
      if (enrolled) {
        Alert.alert(
          'Already Enrolled',
          'You have already completed biometric enrollment. Would you like to re-enroll?',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Re-enroll', onPress: () => startEnrollment() },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const startEnrollment = async () => {
    try {
      setIsLoading(true);
      setCurrentStep(1);
      setError(null);

      // Step 1: Check device capabilities
      await performDeviceCheck();

      // Step 2: Capture face biometric
      await performFaceCapture();

      // Step 3: Perform liveness detection
      await performLivenessDetection();

      // Step 4: Capture fingerprint
      await performFingerprintCapture();

      // Step 5: Generate ZKP commitment
      await generateZKPCommitment();

      // Step 6: Register with backend
      await registerWithBackend();

      // Complete enrollment
      setEnrollmentComplete(true);
      setCurrentStep(ENROLLMENT_STEPS.length);

    } catch (error) {
      console.error('Enrollment error:', error);
      setError(error.message);
      Alert.alert('Enrollment Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const performDeviceCheck = async () => {
    setCurrentStep(1);
    
    const result = await biometricService.initialize();
    if (!result.success) {
      throw new Error(result.error);
    }

    const support = await biometricService.checkBiometricSupport();
    if (!support.supported) {
      throw new Error(support.reason);
    }

    setEnrollmentData(prev => ({
      ...prev,
      deviceCapabilities: support,
    }));

    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
  };

  const performFaceCapture = async () => {
    setCurrentStep(2);
    
    // Show instructions
    setCurrentInstruction({
      title: 'Face Capture',
      steps: [
        'Position your face in the center of the camera',
        'Ensure good lighting',
        'Look directly at the camera',
        'Keep your face steady',
      ],
      icon: 'face',
    });
    setShowInstructions(true);

    return new Promise((resolve, reject) => {
      const handleCapture = async () => {
        try {
          setShowInstructions(false);
          
          const result = await biometricService.captureFaceForEnrollment();
          if (!result.success) {
            throw new Error(result.error);
          }

          if (result.data.quality < 0.7) {
            throw new Error('Face quality too low. Please try again in better lighting.');
          }

          setEnrollmentData(prev => ({
            ...prev,
            faceData: result.data,
          }));

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      // Auto start capture after instructions
      setTimeout(handleCapture, 2000);
    });
  };

  const performLivenessDetection = async () => {
    setCurrentStep(3);

    if (!enrollmentData.faceData) {
      throw new Error('Face data not available for liveness detection');
    }

    setCurrentInstruction({
      title: 'Liveness Detection',
      steps: [
        'Look directly at the camera',
        'Blink your eyes naturally',
        'Move your head slightly',
        'Do not use photos or videos',
      ],
      icon: 'visibility',
    });
    setShowInstructions(true);

    return new Promise(async (resolve, reject) => {
      try {
        setTimeout(async () => {
          setShowInstructions(false);
          
          const livenessResult = await biometricService.performLivenessDetection(
            enrollmentData.faceData
          );

          if (!livenessResult.isLive) {
            throw new Error('Liveness detection failed. Please ensure you are not using a photo.');
          }

          setEnrollmentData(prev => ({
            ...prev,
            livenessResult,
          }));

          resolve();
        }, 2000);
      } catch (error) {
        reject(error);
      }
    });
  };

  const performFingerprintCapture = async () => {
    setCurrentStep(4);

    setCurrentInstruction({
      title: 'Fingerprint Capture',
      steps: [
        'Place your finger on the sensor',
        'Apply gentle pressure',
        'Keep finger steady until vibration',
        'Use your primary finger',
      ],
      icon: 'fingerprint',
    });
    setShowInstructions(true);

    return new Promise(async (resolve, reject) => {
      try {
        setTimeout(async () => {
          setShowInstructions(false);
          
          const result = await biometricService.captureFingerprintForEnrollment();
          if (!result.success) {
            throw new Error(result.error);
          }

          setEnrollmentData(prev => ({
            ...prev,
            fingerprintData: result.data,
          }));

          resolve();
        }, 1500);
      } catch (error) {
        reject(error);
      }
    });
  };

  const generateZKPCommitment = async () => {
    setCurrentStep(5);

    const biometricData = {
      face: enrollmentData.faceData,
      fingerprint: enrollmentData.fingerprintData,
      liveness: enrollmentData.livenessResult,
    };

    const commitment = await zkpService.generateBiometricCommitment(biometricData);
    
    setEnrollmentData(prev => ({
      ...prev,
      commitment,
    }));

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate ZKP generation
  };

  const registerWithBackend = async () => {
    setCurrentStep(6);

    const result = await biometricService.enrollBiometric(user.scholarId, {
      faceData: enrollmentData.faceData,
      fingerprintData: enrollmentData.fingerprintData,
      livenessResult: enrollmentData.livenessResult,
      commitment: enrollmentData.commitment,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate backend registration
  };

  const handleRetry = () => {
    setCurrentStep(0);
    setError(null);
    setEnrollmentComplete(false);
    setEnrollmentData({
      deviceCapabilities: null,
      faceData: null,
      fingerprintData: null,
      livenessResult: null,
      commitment: null,
    });
  };

  const handleComplete = () => {
    Alert.alert(
      'Enrollment Complete',
      'Your biometric enrollment is now complete. You can now mark attendance using biometric authentication.',
      [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('ScholarTabs'),
        },
      ]
    );
  };

  const renderWelcomeCard = () => (
    <Card style={styles.welcomeCard}>
      <Card.Content>
        <View style={styles.welcomeHeader}>
          <Icon name="security" size={48} color="#6C63FF" />
          <Text style={styles.welcomeTitle}>Biometric Enrollment</Text>
        </View>
        
        <Text style={styles.welcomeDescription}>
          Complete biometric enrollment to enable secure attendance marking. 
          Your biometric data will be protected using Zero-Knowledge Proof technology.
        </Text>
        
        <View style={styles.securityFeatures}>
          <View style={styles.securityFeature}>
            <Icon name="verified-user" size={20} color="#4CAF50" />
            <Text style={styles.securityFeatureText}>Secure & Private</Text>
          </View>
          
          <View style={styles.securityFeature}>
            <Icon name="fingerprint" size={20} color="#4CAF50" />
            <Text style={styles.securityFeatureText}>Biometric Protected</Text>
          </View>
          
          <View style={styles.securityFeature}>
            <Icon name="lock" size={20} color="#4CAF50" />
            <Text style={styles.securityFeatureText}>Zero-Knowledge Proof</Text>
          </View>
        </View>

        {!isLoading && currentStep === 0 && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Button
              mode="contained"
              onPress={startEnrollment}
              style={styles.startButton}
              contentStyle={styles.startButtonContent}
              labelStyle={styles.startButtonLabel}
            >
              Start Enrollment
            </Button>
          </Animated.View>
        )}
      </Card.Content>
    </Card>
  );

  const renderProgressCard = () => {
    if (currentStep === 0 && !error) return null;

    return (
      <Card style={styles.progressCard}>
        <Card.Content>
          <Text style={styles.progressTitle}>Enrollment Progress</Text>
          
          <ProgressBar
            progress={currentStep / ENROLLMENT_STEPS.length}
            color="#6C63FF"
            style={styles.progressBar}
          />
          
          <Text style={styles.progressText}>
            {currentStep > 0 && currentStep <= ENROLLMENT_STEPS.length
              ? `Step ${currentStep}: ${ENROLLMENT_STEPS[currentStep - 1]?.title}`
              : enrollmentComplete
              ? 'Enrollment Complete!'
              : 'Ready to start'
            }
          </Text>
          
          {isLoading && (
            <View style={styles.progressLoading}>
              <ActivityIndicator color="#6C63FF" size="small" />
              <Text style={styles.progressLoadingText}>
                {ENROLLMENT_STEPS[currentStep - 1]?.description || 'Processing...'}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderStepsCard = () => (
    <Card style={styles.stepsCard}>
      <Card.Content>
        <Text style={styles.stepsTitle}>Enrollment Steps</Text>
        
        {ENROLLMENT_STEPS.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View style={[
              styles.stepIcon,
              {
                backgroundColor: currentStep > index
                  ? '#4CAF50'
                  : currentStep === index + 1
                  ? '#6C63FF'
                  : '#E0E0E0'
              }
            ]}>
              <Icon
                name={step.icon}
                size={20}
                color={currentStep >= index + 1 ? 'white' : '#999'}
              />
            </View>
            
            <View style={styles.stepContent}>
              <Text style={[
                styles.stepTitle,
                {
                  color: currentStep > index
                    ? '#4CAF50'
                    : currentStep === index + 1
                    ? '#6C63FF'
                    : '#999'
                }
              ]}>
                {step.title}
              </Text>
              <Text style={styles.stepDescription}>
                {step.description}
              </Text>
            </View>
            
            {currentStep > index && (
              <Icon name="check-circle" size={24} color="#4CAF50" />
            )}
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  const renderSuccessCard = () => {
    if (!enrollmentComplete) return null;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Card style={styles.successCard}>
          <Card.Content>
            <View style={styles.successHeader}>
              <Icon name="check-circle" size={64} color="#4CAF50" />
              <Text style={styles.successTitle}>Enrollment Complete!</Text>
            </View>
            
            <Text style={styles.successDescription}>
              Your biometric data has been successfully enrolled using advanced 
              Zero-Knowledge Proof technology. You can now mark attendance securely.
            </Text>
            
            <View style={styles.successStats}>
              <View style={styles.successStat}>
                <Text style={styles.successStatValue}>✓</Text>
                <Text style={styles.successStatLabel}>Face Enrolled</Text>
              </View>
              
              <View style={styles.successStat}>
                <Text style={styles.successStatValue}>✓</Text>
                <Text style={styles.successStatLabel}>Fingerprint Enrolled</Text>
              </View>
              
              <View style={styles.successStat}>
                <Text style={styles.successStatValue}>✓</Text>
                <Text style={styles.successStatLabel}>ZKP Generated</Text>
              </View>
            </View>
            
            <Button
              mode="contained"
              onPress={handleComplete}
              style={styles.completeButton}
              contentStyle={styles.completeButtonContent}
            >
              Continue to Dashboard
            </Button>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const renderErrorCard = () => {
    if (!error) return null;

    return (
      <Card style={styles.errorCard}>
        <Card.Content>
          <View style={styles.errorHeader}>
            <Icon name="error" size={48} color="#F44336" />
            <Text style={styles.errorTitle}>Enrollment Failed</Text>
          </View>
          
          <Text style={styles.errorDescription}>
            {error}
          </Text>
          
          <View style={styles.errorActions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.errorButton}
            >
              Go Back
            </Button>
            
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.errorButton}
            >
              Try Again
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>Biometric Enrollment</Text>
        </View>

        {/* Welcome Card */}
        {renderWelcomeCard()}

        {/* Progress Card */}
        {renderProgressCard()}

        {/* Steps Card */}
        {renderStepsCard()}

        {/* Success Card */}
        {renderSuccessCard()}

        {/* Error Card */}
        {renderErrorCard()}
      </ScrollView>

      {/* Instructions Modal */}
      <Portal>
        <Modal
          visible={showInstructions}
          onDismiss={() => setShowInstructions(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Title
              title={currentInstruction?.title}
              subtitle="Follow these instructions"
              left={(props) => (
                <Icon name={currentInstruction?.icon} size={24} color="#6C63FF" />
              )}
            />
            <Card.Content>
              {currentInstruction?.steps.map((step, index) => (
                <View key={index} style={styles.instructionStep}>
                  <Text style={styles.instructionNumber}>{index + 1}</Text>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
              
              <View style={styles.instructionFooter}>
                <ActivityIndicator color="#6C63FF" size="small" />
                <Text style={styles.instructionFooterText}>
                  Starting in a moment...
                </Text>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeCard: {
    margin: 16,
    elevation: 4,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  securityFeatures: {
    marginBottom: 24,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityFeatureText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  startButton: {
    borderRadius: 8,
  },
  startButtonContent: {
    paddingVertical: 8,
  },
  startButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  progressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressLoadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  stepsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
  },
  successCard: {
    margin: 16,
    elevation: 4,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
  },
  successDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  successStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  successStat: {
    alignItems: 'center',
  },
  successStatValue: {
    fontSize: 24,
    color: '#4CAF50',
    marginBottom: 4,
  },
  successStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  completeButton: {
    borderRadius: 8,
  },
  completeButtonContent: {
    paddingVertical: 8,
  },
  errorCard: {
    margin: 16,
    elevation: 4,
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  errorButton: {
    flex: 0.45,
  },
  modalContainer: {
    margin: 20,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  instructionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  instructionFooterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

export default BiometricEnrollmentScreen;