// src/contexts/LocationContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const LocationContext = createContext();

const initialState = {
  currentLocation: null,
  isLocationEnabled: false,
  isWithinBounds: false,
  organizationBounds: null,
  isLoading: false,
  accuracy: null,
  lastKnownLocation: null,
  error: null,
};

const locationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        lastKnownLocation: action.payload,
        isLoading: false,
        error: null,
      };
    
    case 'SET_LOCATION_ENABLED':
      return { ...state, isLocationEnabled: action.payload };
    
    case 'SET_WITHIN_BOUNDS':
      return { ...state, isWithinBounds: action.payload };
    
    case 'SET_ORGANIZATION_BOUNDS':
      return { ...state, organizationBounds: action.payload };
    
    case 'SET_ACCURACY':
      return { ...state, accuracy: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    default:
      return state;
  }
};

export const LocationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(locationReducer, initialState);

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      // Check location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        dispatch({ type: 'SET_ERROR', payload: 'Location permission denied' });
        Alert.alert(
          'Location Required',
          'This app requires location access to verify attendance. Please enable location permissions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      dispatch({ type: 'SET_LOCATION_ENABLED', payload: true });
      
      // Get last known location from storage
      const lastLocation = await AsyncStorage.getItem('last_location');
      if (lastLocation) {
        const parsedLocation = JSON.parse(lastLocation);
        dispatch({ type: 'SET_LOCATION', payload: parsedLocation });
      }

      // Start location tracking
      await getCurrentLocation();
      
    } catch (error) {
      console.error('Location initialization error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const getCurrentLocation = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: Date.now(),
      };

      // Store location locally
      await AsyncStorage.setItem('last_location', JSON.stringify(locationData));
      
      dispatch({ type: 'SET_LOCATION', payload: locationData });
      dispatch({ type: 'SET_ACCURACY', payload: location.coords.accuracy });

      // Check if within organization bounds
      if (state.organizationBounds) {
        const withinBounds = checkWithinBounds(locationData, state.organizationBounds);
        dispatch({ type: 'SET_WITHIN_BOUNDS', payload: withinBounds });
      }

      return locationData;
    } catch (error) {
      console.error('Get location error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      
      // Try to use last known location
      const lastLocation = await AsyncStorage.getItem('last_location');
      if (lastLocation) {
        const parsedLocation = JSON.parse(lastLocation);
        dispatch({ type: 'SET_LOCATION', payload: parsedLocation });
        return parsedLocation;
      }
      
      throw error;
    }
  };

  const setOrganizationBounds = (bounds) => {
    dispatch({ type: 'SET_ORGANIZATION_BOUNDS', payload: bounds });
    
    // Re-check if current location is within bounds
    if (state.currentLocation) {
      const withinBounds = checkWithinBounds(state.currentLocation, bounds);
      dispatch({ type: 'SET_WITHIN_BOUNDS', payload: withinBounds });
    }
  };

  const checkWithinBounds = (location, bounds) => {
    if (!location || !bounds) return false;

    const { latitude, longitude } = location;
    const { center, radius } = bounds;

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      latitude,
      longitude,
      center.latitude,
      center.longitude
    );

    return distance <= radius;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: Date.now(),
          };

          dispatch({ type: 'SET_LOCATION', payload: locationData });
          dispatch({ type: 'SET_ACCURACY', payload: location.coords.accuracy });

          // Check bounds
          if (state.organizationBounds) {
            const withinBounds = checkWithinBounds(locationData, state.organizationBounds);
            dispatch({ type: 'SET_WITHIN_BOUNDS', payload: withinBounds });
          }

          // Store latest location
          AsyncStorage.setItem('last_location', JSON.stringify(locationData));
        }
      );

      return subscription;
    } catch (error) {
      console.error('Start location tracking error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const verifyLocationForAttendance = async () => {
    try {
      // Get fresh location
      const location = await getCurrentLocation();
      
      if (!location) {
        throw new Error('Unable to get current location');
      }

      // Check accuracy
      if (location.accuracy > 50) {
        throw new Error('Location accuracy is too low. Please ensure GPS is enabled.');
      }

      // Check if within organization bounds
      if (!state.organizationBounds) {
        throw new Error('Organization boundaries not set');
      }

      const withinBounds = checkWithinBounds(location, state.organizationBounds);
      
      if (!withinBounds) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          state.organizationBounds.center.latitude,
          state.organizationBounds.center.longitude
        );
        
        throw new Error(
          `You are ${Math.round(distance)}m away from the campus. ` +
          `You must be within ${state.organizationBounds.radius}m to mark attendance.`
        );
      }

      return {
        success: true,
        location,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          state.organizationBounds.center.latitude,
          state.organizationBounds.center.longitude
        ),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const value = {
    ...state,
    getCurrentLocation,
    setOrganizationBounds,
    checkWithinBounds,
    calculateDistance,
    startLocationTracking,
    verifyLocationForAttendance,
    initializeLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};