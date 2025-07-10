// mobile/PramaanExpo/src/components/FaceCaptureModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button } from 'react-native-paper';

const FaceCaptureModal = ({ visible, onClose, onCapture }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const takePicture = async () => {
    if (camera) {
      try {
        setCapturing(true);
        const photo = await camera.takePictureAsync({
          quality: 0.8,
          base64: true,
          skipProcessing: true,
        });
        setPhotoUri(photo.uri);
        setCapturing(false);
      } catch (error) {
        console.error('Take picture error:', error);
        Alert.alert('Error', 'Failed to capture photo');
        setCapturing(false);
      }
    }
  };

  const confirmPhoto = () => {
    if (photoUri) {
      onCapture({ uri: photoUri });
      resetCamera();
      onClose();
    }
  };

  const retakePhoto = () => {
    setPhotoUri(null);
  };

  const resetCamera = () => {
    setPhotoUri(null);
    setCapturing(false);
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Icon name="camera-off" size={64} color="#666" />
          <Text style={styles.errorText}>Camera permission denied</Text>
          <Button mode="contained" onPress={onClose} style={styles.button}>
            Close
          </Button>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Capture Face Photo</Text>
          <View style={{ width: 40 }} />
        </View>

        {photoUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.preview} />
            <View style={styles.previewButtons}>
              <Button
                mode="outlined"
                onPress={retakePhoto}
                style={[styles.button, styles.retakeButton]}
                icon="camera-retake"
              >
                Retake
              </Button>
              <Button
                mode="contained"
                onPress={confirmPhoto}
                style={[styles.button, styles.confirmButton]}
                icon="check"
              >
                Use Photo
              </Button>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.cameraContainer}>
              <Camera
                style={styles.camera}
                type={CameraType.front}
                ref={(ref) => setCamera(ref)}
              >
                <View style={styles.cameraOverlay}>
                  <View style={styles.faceGuide} />
                </View>
              </Camera>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                Position your face within the circle
              </Text>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                disabled={capturing}
              >
                {capturing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Icon name="camera" size={32} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
  },
  instructions: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  preview: {
    width: 300,
    height: 300,
    borderRadius: 150,
    marginBottom: 30,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    marginHorizontal: 10,
  },
  retakeButton: {
    borderColor: '#6C63FF',
  },
  confirmButton: {
    backgroundColor: '#6C63FF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default FaceCaptureModal;