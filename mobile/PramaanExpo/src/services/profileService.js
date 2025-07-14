// mobile/PramaanExpo/src/services/profileService.js
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ProfileService {
  /**
   * Pick profile photo from gallery
   */
  async pickProfilePhoto() {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access media library was denied'
        };
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          success: true,
          photo: {
            uri: asset.uri,
            base64: asset.base64,
            width: asset.width,
            height: asset.height,
          }
        };
      }

      return {
        success: false,
        error: 'No image selected'
      };
    } catch (error) {
      console.error('Error picking profile photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Take profile photo using camera
   */
  async takeProfilePhoto() {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access camera was denied'
        };
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          success: true,
          photo: {
            uri: asset.uri,
            base64: asset.base64,
            width: asset.width,
            height: asset.height,
          }
        };
      }

      return {
        success: false,
        error: 'No photo taken'
      };
    } catch (error) {
      console.error('Error taking profile photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save profile photo locally
   */
  async saveProfilePhoto(userId, photoUri) {
    try {
      const fileName = `profile_${userId}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copy the photo to app's document directory
      await FileSystem.copyAsync({
        from: photoUri,
        to: fileUri
      });

      // Save the URI in AsyncStorage
      await AsyncStorage.setItem(`profile_photo_${userId}`, fileUri);
      
      return {
        success: true,
        fileUri
      };
    } catch (error) {
      console.error('Error saving profile photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get saved profile photo
   */
  async getProfilePhoto(userId) {
    try {
      const fileUri = await AsyncStorage.getItem(`profile_photo_${userId}`);
      if (fileUri) {
        // Check if file still exists
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          return {
            success: true,
            fileUri
          };
        }
      }
      
      return {
        success: false,
        error: 'No profile photo found'
      };
    } catch (error) {
      console.error('Error getting profile photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete profile photo
   */
  async deleteProfilePhoto(userId) {
    try {
      const fileUri = await AsyncStorage.getItem(`profile_photo_${userId}`);
      if (fileUri) {
        // Delete the file
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        // Remove from AsyncStorage
        await AsyncStorage.removeItem(`profile_photo_${userId}`);
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const profileService = new ProfileService();

// Export default
export default profileService;

// Also export the function directly for backward compatibility
export const pickProfilePhoto = profileService.pickProfilePhoto.bind(profileService);