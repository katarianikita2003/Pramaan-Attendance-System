// ===== mobile/src/services/location.service.js =====
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationService {
  constructor() {
    this.watchId = null;
    this.lastKnownLocation = null;
  }

  async requestPermission() {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }
    
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Pramaan needs access to your location for attendance verification',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    return false;
  }

  async getCurrentLocation() {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }
    
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp
          };
          
          this.lastKnownLocation = location;
          await this.saveLocation(location);
          
          resolve(location);
        },
        (error) => {
          console.error('Location error:', error);
          reject(new Error(error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          forceLocationRequest: true
        }
      );
    });
  }

  async saveLocation(location) {
    try {
      await AsyncStorage.setItem('last_known_location', JSON.stringify(location));
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  }

  async getLastKnownLocation() {
    if (this.lastKnownLocation) {
      return this.lastKnownLocation;
    }
    
    try {
      const saved = await AsyncStorage.getItem('last_known_location');
      if (saved) {
        this.lastKnownLocation = JSON.parse(saved);
        return this.lastKnownLocation;
      }
    } catch (error) {
      console.error('Failed to get last location:', error);
    }
    
    return null;
  }

  startLocationTracking(callback) {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        this.lastKnownLocation = location;
        callback(location);
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // meters
        interval: 10000, // 10 seconds
        fastestInterval: 5000 // 5 seconds
      }
    );
  }

  stopLocationTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }

  isWithinBounds(location, center, radius) {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      center.latitude,
      center.longitude
    );
    
    return distance <= radius;
  }
}

export const locationService = new LocationService();