export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000', // Android emulator
  ios: 'http://localhost:5000',
  default: 'http://localhost:5000'
});