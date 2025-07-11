// mobile/PramaanExpo/src/utils/imagePickerHelper.js
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

// Image picker options
const DEFAULT_OPTIONS = {
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

// Request camera permissions
export const requestCameraPermission = async () => {
  if (Platform.OS === 'web') {
    return { granted: true };
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return { granted: status === 'granted' };
};

// Request media library permissions
export const requestMediaLibraryPermission = async () => {
  if (Platform.OS === 'web') {
    return { granted: true };
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return { granted: status === 'granted' };
};

// Pick image from library
export const pickImageFromLibrary = async (options = {}) => {
  try {
    // Request permission
    const permission = await requestMediaLibraryPermission();
    
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to select images.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => ImagePicker.openSettings() }
        ]
      );
      return null;
    }

    // Launch image picker with updated API
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images, // Updated from MediaTypeOptions
      ...DEFAULT_OPTIONS,
      ...options,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error picking image from library:', error);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
    return null;
  }
};

// Take photo with camera
export const takePhotoWithCamera = async (options = {}) => {
  try {
    // Request permission
    const permission = await requestCameraPermission();
    
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera to take photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => ImagePicker.openSettings() }
        ]
      );
      return null;
    }

    // Launch camera with updated API
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.Images, // Updated from MediaTypeOptions
      ...DEFAULT_OPTIONS,
      ...options,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
};

// Show image picker options (camera or library)
export const showImagePickerOptions = async (options = {}) => {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Image',
      'Choose from where you want to select an image',
      [
        { text: 'Camera', onPress: async () => {
          const photo = await takePhotoWithCamera(options);
          resolve(photo);
        }},
        { text: 'Gallery', onPress: async () => {
          const photo = await pickImageFromLibrary(options);
          resolve(photo);
        }},
        { text: 'Cancel', onPress: () => resolve(null), style: 'cancel' }
      ],
      { cancelable: true }
    );
  });
};

// Validate image
export const validateImage = (image) => {
  if (!image || !image.uri) {
    return { valid: false, error: 'No image selected' };
  }

  // Check file size (5MB limit)
  if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
    return { valid: false, error: 'Image size must be less than 5MB' };
  }

  // Check dimensions
  if (image.width && image.height) {
    if (image.width < 200 || image.height < 200) {
      return { valid: false, error: 'Image must be at least 200x200 pixels' };
    }
  }

  return { valid: true };
};

// Convert image to base64
export const convertImageToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

// Get image info
export const getImageInfo = (image) => {
  if (!image) return null;
  
  return {
    uri: image.uri,
    width: image.width,
    height: image.height,
    type: image.type || 'image/jpeg',
    fileName: image.fileName || image.uri.split('/').pop(),
    fileSize: image.fileSize,
  };
};

export default {
  pickImageFromLibrary,
  takePhotoWithCamera,
  showImagePickerOptions,
  validateImage,
  convertImageToBase64,
  getImageInfo,
  requestCameraPermission,
  requestMediaLibraryPermission,
};