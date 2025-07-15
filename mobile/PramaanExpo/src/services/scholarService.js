// mobile/PramaanExpo/src/services/scholarService.js
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ScholarService {
  async getProfile() {
    try {
      const response = await api.get('/scholar/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  async updateProfile(data) {
    try {
      const response = await api.put('/scholar/profile', data);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await api.get('/scholar/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  }

  async getAttendanceHistory(page = 1, limit = 20) {
    try {
      const response = await api.get('/scholar/attendance/history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get attendance history error:', error);
      throw error;
    }
  }

  // Removed getTodayAttendance since the endpoint doesn't exist
  // Today's attendance can be determined from the history
}

export default new ScholarService();