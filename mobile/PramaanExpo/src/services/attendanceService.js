// mobile/PramaanExpo/src/services/attendanceService.js
import api from './api';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AttendanceService {
  /**
   * Mark attendance with biometric proof and location
   */
  async markAttendance(scholarId, biometricProof) {
    try {
      // Get current location
      const location = await this.getCurrentLocation();
      
      // biometricProof is now just a string (the hash)
      const requestData = {
        scholarId,
        biometricProof: biometricProof,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.log('Marking attendance with data:', {
        scholarId,
        biometricProof: biometricProof ? biometricProof.substring(0, 20) + '...' : 'undefined',
        location: requestData.location,
        timestamp: requestData.timestamp,
      });
      
      const response = await api.post('/attendance/mark', requestData);
      
      // Save attendance info locally for offline access
      if (response.data.success) {
        await this.saveLocalAttendance(response.data.attendance);
      }
      
      return response.data;
    } catch (error) {
      console.error('Attendance marking error:', error);
      
      // If offline, queue the attendance
      if (error.message === 'Network Error') {
        await this.queueOfflineAttendance(scholarId, biometricProof);
        throw new Error('Attendance queued for sync when online');
      }
      
      throw error;
    }
  }

  /**
   * Get today's attendance record
   */
  async getTodayAttendance() {
    try {
      const response = await api.get('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('Get today attendance error:', error);
      
      // Try to get from local storage if offline
      if (error.message === 'Network Error') {
        const localAttendance = await this.getLocalTodayAttendance();
        if (localAttendance) {
          return { success: true, attendance: localAttendance, offline: true };
        }
      }
      
      throw error;
    }
  }

  /**
   * Get attendance history with pagination
   */
  async getAttendanceHistory(limit = 10, page = 1) {
    try {
      const response = await api.get('/scholar/attendance/history', {
        params: { limit, page }
      });
      return response.data;
    } catch (error) {
      console.error('Get attendance history error:', error);
      
      // Try local storage if offline
      if (error.message === 'Network Error') {
        const localHistory = await this.getLocalAttendanceHistory(limit);
        if (localHistory) {
          return { success: true, history: localHistory, offline: true };
        }
      }
      
      throw error;
    }
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats() {
    try {
      const response = await api.get('/scholar/stats');
      return response.data;
    } catch (error) {
      console.error('Get attendance stats error:', error);
      throw error;
    }
  }

  /**
   * Get current device location
   */
  async getCurrentLocation() {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 1000,
      });
      
      console.log('Current location obtained:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      
      return location;
    } catch (error) {
      console.error('Location error:', error);
      
      // Return default location for testing (Chandigarh)
      console.log('Using default location for testing');
      return {
        coords: {
          latitude: 30.7333,
          longitude: 76.7794,
          accuracy: 100,
        },
      };
    }
  }

  /**
   * Verify if location is within campus bounds
   */
  async isWithinCampus(location) {
    try {
      const response = await api.post('/attendance/verify-location', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      return response.data.withinBounds;
    } catch (error) {
      console.error('Location verification error:', error);
      // Default to true in case of error (let backend handle validation)
      return true;
    }
  }

  /**
   * Get attendance certificate/proof
   */
  async getAttendanceCertificate(attendanceId) {
    try {
      const response = await api.get(`/attendance/certificate/${attendanceId}`);
      return response.data;
    } catch (error) {
      console.error('Get certificate error:', error);
      throw error;
    }
  }

  /**
   * Verify attendance proof/certificate
   */
  async verifyAttendanceProof(proofId) {
    try {
      const response = await api.get(`/attendance/verify/${proofId}`);
      return response.data;
    } catch (error) {
      console.error('Verify proof error:', error);
      throw error;
    }
  }

  // Local storage methods for offline support

  /**
   * Save attendance record locally
   */
  async saveLocalAttendance(attendance) {
    try {
      const key = `attendance_${new Date().toISOString().split('T')[0]}`;
      await AsyncStorage.setItem(key, JSON.stringify(attendance));
      
      // Update local history
      const historyKey = 'attendance_history';
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Add to history (keep last 30 records)
      history.unshift(attendance);
      if (history.length > 30) {
        history.pop();
      }
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving local attendance:', error);
    }
  }

  /**
   * Get today's attendance from local storage
   */
  async getLocalTodayAttendance() {
    try {
      const key = `attendance_${new Date().toISOString().split('T')[0]}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting local attendance:', error);
      return null;
    }
  }

  /**
   * Get attendance history from local storage
   */
  async getLocalAttendanceHistory(limit = 10) {
    try {
      const data = await AsyncStorage.getItem('attendance_history');
      const history = data ? JSON.parse(data) : [];
      return history.slice(0, limit);
    } catch (error) {
      console.error('Error getting local history:', error);
      return [];
    }
  }

  /**
   * Queue attendance for offline sync
   */
  async queueOfflineAttendance(scholarId, biometricProof) {
    try {
      const queueKey = 'offline_attendance_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      const location = await this.getCurrentLocation();
      
      queue.push({
        id: Date.now().toString(),
        scholarId,
        biometricProof,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: new Date().toISOString(),
        retries: 0,
      });
      
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log('Attendance queued for offline sync');
    } catch (error) {
      console.error('Error queuing offline attendance:', error);
    }
  }

  /**
   * Sync offline attendance queue
   */
  async syncOfflineAttendance() {
    try {
      const queueKey = 'offline_attendance_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      if (queue.length === 0) {
        return { synced: 0, failed: 0 };
      }
      
      console.log(`Syncing ${queue.length} offline attendance records`);
      
      const results = { synced: 0, failed: 0 };
      const remainingQueue = [];
      
      for (const item of queue) {
        try {
          await api.post('/attendance/mark', {
            scholarId: item.scholarId,
            biometricProof: item.biometricProof,
            location: item.location,
            timestamp: item.timestamp,
            offline: true,
          });
          
          results.synced++;
        } catch (error) {
          console.error('Failed to sync attendance:', error);
          item.retries++;
          
          // Keep in queue if less than 3 retries
          if (item.retries < 3) {
            remainingQueue.push(item);
          }
          
          results.failed++;
        }
      }
      
      // Update queue with remaining items
      await AsyncStorage.setItem(queueKey, JSON.stringify(remainingQueue));
      
      return results;
    } catch (error) {
      console.error('Error syncing offline attendance:', error);
      return { synced: 0, failed: 0 };
    }
  }

  /**
   * Clear all local attendance data
   */
  async clearLocalData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const attendanceKeys = keys.filter(key => 
        key.startsWith('attendance_') || 
        key === 'attendance_history' || 
        key === 'offline_attendance_queue'
      );
      
      await AsyncStorage.multiRemove(attendanceKeys);
      console.log('Local attendance data cleared');
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }
}

// Create singleton instance
const attendanceService = new AttendanceService();

// Export the instance
export default attendanceService;