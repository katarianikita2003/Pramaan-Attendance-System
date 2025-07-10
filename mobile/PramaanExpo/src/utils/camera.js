// utils/camera.js
import * as ImagePicker from 'expo-image-picker';

export const captureImage = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions!');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [1, 1],
      quality: options.quality ?? 0.7,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
};

export const pickImage = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need gallery permissions!');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [1, 1],
      quality: options.quality ?? 0.7,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
};
