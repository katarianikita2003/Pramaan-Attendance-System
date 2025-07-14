// backend/src/services/locationService.js
import logger from '../utils/logger.js';

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validate if a location is within campus boundaries
 * @param {Object} userLocation - User's current location
 * @param {Object} campusBoundary - Campus boundary configuration
 * @returns {boolean} True if within boundaries
 */
const validateLocation = async (userLocation, campusBoundary) => {
  try {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      logger.error('Invalid user location data');
      return false;
    }

    // If campus boundary not configured, allow attendance
    if (!campusBoundary || !campusBoundary.center) {
      logger.warn('Campus boundary not configured, allowing attendance');
      return true;
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      campusBoundary.center.latitude,
      campusBoundary.center.longitude
    );

    const radius = campusBoundary.radius || 500; // Default 500 meters
    const isWithinBounds = distance <= radius;

    logger.info(`Location validation: Distance=${distance.toFixed(2)}m, Radius=${radius}m, Valid=${isWithinBounds}`);

    return isWithinBounds;
  } catch (error) {
    logger.error('Location validation error:', error);
    return false;
  }
};

/**
 * Check if location is spoofed
 * @param {Object} location - Location data including accuracy
 * @returns {boolean} True if location might be spoofed
 */
const checkLocationSpoofing = (location) => {
  try {
    // Check location accuracy (GPS spoofing often has perfect accuracy)
    if (location.accuracy && location.accuracy < 5) {
      logger.warn('Suspiciously high location accuracy detected');
      return true;
    }

    // Check if mock location (Android specific)
    if (location.mocked) {
      logger.warn('Mock location detected');
      return true;
    }

    // Additional checks can be added here
    // - Speed consistency
    // - Location history pattern
    // - Time-based validation

    return false;
  } catch (error) {
    logger.error('Location spoofing check error:', error);
    return false;
  }
};

/**
 * Get address from coordinates (reverse geocoding)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Object} Address information
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    // This is a placeholder - implement with actual geocoding service
    // Options: Google Maps API, OpenStreetMap Nominatim, etc.
    
    return {
      formatted: 'Campus Location',
      campus: 'Main Campus',
      building: 'Academic Block'
    };
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    return null;
  }
};

/**
 * Validate if current time is within working hours
 * @param {Object} workingHours - Organization working hours configuration
 * @returns {boolean} True if within working hours
 */
const validateWorkingHours = (workingHours) => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    // Check if today is a working day
    if (workingHours.workingDays && !workingHours.workingDays.includes(currentDay)) {
      logger.info('Not a working day');
      return false;
    }

    // Check if current time is within working hours
    if (workingHours.startTime && workingHours.endTime) {
      const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
      const [endHour, endMin] = workingHours.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentTime < startMinutes || currentTime > endMinutes) {
        logger.info('Outside working hours');
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Working hours validation error:', error);
    return true; // Allow in case of error
  }
};

// Export as default object with all functions
export default {
  validateLocation,
  checkLocationSpoofing,
  reverseGeocode,
  validateWorkingHours,
  calculateDistance
};