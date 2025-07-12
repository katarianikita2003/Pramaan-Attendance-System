// mobile/PramaanExpo/src/config/api.js
import { Platform } from 'react-native';

// Determine the correct base URL based on the platform
const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // For Android Emulator use 10.0.2.2
      // For physical device use your computer's IP
      // Uncomment the line that works for your setup:
      
      // return 'http://10.0.2.2:5000'; // Android Emulator
      return 'http://10.13.117.32:5000'; // Physical device or if emulator doesn't work
    } else {
      // iOS
      return 'http://10.13.117.32:5000';
    }
  }
  // Production URL (update when you have a production server)
  return 'https://api.pramaan.app';
};

export const API_BASE_URL = `${getBaseUrl()}/api`;
export const BASE_URL = getBaseUrl();

// Export for debugging
console.log('API Configuration:', {
  BASE_URL,
  API_BASE_URL,
  Platform: Platform.OS,
  DEV: __DEV__
});

export default {
  API_BASE_URL,
  BASE_URL
};