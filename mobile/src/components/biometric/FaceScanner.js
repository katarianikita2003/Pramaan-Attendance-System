// ===== mobile/src/components/biometric/FaceScanner.js =====
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import {
  Title,
  Paragraph,
  Button,
  Card,
  ActivityIndicator
} from 'react-native-paper';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor
} from 'react-native-vision-camera';
import {
  Face,
  scanFaces,
  detectFaces
} from '@react-native-ml-kit/face-detection';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceScanner = ({ onCapture, onError }) => {
  const devices = useCameraDevices();
  const device = devices.front;
  const camera = useRef(null);
  
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livenessStep, setLivenessStep] = useState('center'); // center, smile, blink, turn
  const [livenessChecks, setLivenessChecks] = useState({
    centered: false,
    smiled: false,
    blinked: false,
    turned: false
  });
  
  const facePosition = useSharedValue({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'authorized');
  };

  const processLivenessCheck = (face) => {
    const { bounds, smilingProbability, leftEyeOpenProbability, rightEyeOpenProbability, headEulerAngleY } = face;
    
    // Update face position for UI
    facePosition.value = withSpring({
      x: bounds.x,
      y: bounds.y,
      scale: bounds.width / 200
    });

    switch (livenessStep) {
      case 'center':
        // Check if face is centered
        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;
        const faceX = bounds.x + bounds.width / 2;
        const faceY = bounds.y + bounds.height / 2;
        
        if (Math.abs(faceX - centerX) < 50 && Math.abs(faceY - centerY) < 50) {
          setLivenessChecks(prev => ({ ...prev, centered: true }));
          setLivenessStep('smile');
        }
        break;

      case 'smile':
        if (smilingProbability > 0.7) {
          setLivenessChecks(prev => ({ ...prev, smiled: true }));
          setLivenessStep('blink');
        }
        break;

      case 'blink':
        if (leftEyeOpenProbability < 0.3 && rightEyeOpenProbability < 0.3) {
          setLivenessChecks(prev => ({ ...prev, blinked: true }));
          setLivenessStep('turn');
        }
        break;

      case 'turn':
        if (Math.abs(headEulerAngleY) > 30) {
          setLivenessChecks(prev => ({ ...prev, turned: true }));
          captureAndProcess(face);
        }
        break;
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (isProcessing) return;

    const faces = scanFaces(frame);
    if (faces.length > 0) {
      runOnJS(processLivenessCheck)(faces[0]);
    }
  }, [isProcessing, livenessStep]);

  const captureAndProcess = async (face) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const photo = await camera.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality'
      });

      const faceData = {
        photo: photo.path,
        embedding: extractEmbedding(face),
        landmarks: face.landmarks,
        bounds: face.bounds,
        quality: calculateQuality(face),
        livenessScore: calculateLivenessScore(),
        timestamp: Date.now()
      };

      onCapture(faceData);
    } catch (error) {
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractEmbedding = (face) => {
    // In production, use a proper face embedding model
    // This is a simplified version
    const landmarks = face.landmarks || {};
    const embedding = [];
    
    Object.values(landmarks).forEach(point => {
      if (point) {
        embedding.push(point.x, point.y);
      }
    });
    
    return embedding;
  };

  const calculateQuality = (face) => {
    // Simple quality calculation
    const { bounds, landmarks } = face;
    let quality = 0;
    
    // Face size
    const faceArea = bounds.width * bounds.height;
    const screenArea = screenWidth * screenHeight;
    const sizeRatio = faceArea / screenArea;
    
    if (sizeRatio > 0.1 && sizeRatio < 0.5) quality += 0.5;
    
    // Landmarks detected
    if (landmarks && Object.keys(landmarks).length > 10) quality += 0.5;
    
    return quality;
  };

  const calculateLivenessScore = () => {
    const checks = Object.values(livenessChecks);
    const passedChecks = checks.filter(check => check).length;
    return passedChecks / checks.length;
  };

  const getInstructionText = () => {
    switch (livenessStep) {
      case 'center':
        return 'Position your face in the center of the frame';
      case 'smile':
        return 'Please smile';
      case 'blink':
        return 'Please blink your eyes';
      case 'turn':
        return 'Turn your head slightly to the side';
      default:
        return 'Processing...';
    }
  };

  const faceOverlayStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: facePosition.value.x },
        { translateY: facePosition.value.y },
        { scale: facePosition.value.scale }
      ]
    };
  });

  if (!hasPermission) {
    return (
      <Card style={styles.errorCard}>
        <Card.Content>
          <Title>Camera Permission Required</Title>
          <Paragraph>Please enable camera access to use face recognition</Paragraph>
          <Button onPress={requestCameraPermission}>Grant Permission</Button>
        </Card.Content>
      </Card>
    );
  }

  if (!device) {
    return (
      <Card style={styles.errorCard}>
        <Card.Content>
          <Title>No Camera Found</Title>
          <Paragraph>Your device doesn't have a front camera</Paragraph>
        </Card.Content>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        photo={true}
      />
      
      <View style={styles.overlay}>
        <View style={styles.instructionContainer}>
          <Title style={styles.instruction}>{getInstructionText()}</Title>
        </View>
        
        <View style={styles.faceGuide} />
        
        <Animated.View style={[styles.faceOverlay, faceOverlayStyle]} />
        
        <View style={styles.livenessIndicator}>
          {Object.entries(livenessChecks).map(([key, value]) => (
            <View key={key} style={[styles.checkDot, value && styles.checkDotActive]} />
          ))}
        </View>
      </View>
      
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Title style={styles.processingText}>Processing...</Title>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  instructionContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  faceGuide: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: '60%',
    height: '30%',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: screenWidth * 0.3,
    borderStyle: 'dashed',
  },
  faceOverlay: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 100,
  },
  livenessIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  checkDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  checkDotActive: {
    backgroundColor: '#4CAF50',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
  },
  errorCard: {
    margin: 16,
  },
});

export default FaceScanner;