// mobile/PramaanExpo/src/services/cameraService.js
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';

class CameraService {
  async requestPermissions() {
    const cameraResult = await Camera.requestCameraPermissionsAsync();
    const mediaLibraryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return {
      camera: cameraResult.status === 'granted',
      mediaLibrary: mediaLibraryResult.status === 'granted'
    };
  }

  async captureImage(options = {}) {
    try {
      const { camera } = await this.requestPermissions();
      if (!camera) {
        alert('Camera permission is required to capture images');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        quality: options.quality ?? 0.8,
        base64: options.base64 ?? true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        };
      }
      return null;
    } catch (error) {
      console.error('Camera capture error:', error);
      alert('Failed to capture image: ' + error.message);
      return null;
    }
  }

  async pickImage(options = {}) {
    try {
      const { mediaLibrary } = await this.requestPermissions();
      if (!mediaLibrary) {
        alert('Media library permission is required');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        quality: options.quality ?? 0.8,
        base64: options.base64 ?? true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return {
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        };
      }
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      alert('Failed to pick image: ' + error.message);
      return null;
    }
  }

  async captureFaceForBiometric() {
    try {
      const image = await this.captureImage({
        allowsEditing: false,
        base64: true
      });

      if (!image) {
        throw new Error('No image captured');
      }

      // For now, we'll return the image data
      // Face detection can be done on the backend
      return {
        imageUri: image.uri,
        imageBase64: image.base64,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Face capture error:', error);
      throw error;
    }
  }
}

export default new CameraService();
