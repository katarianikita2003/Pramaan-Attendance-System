// mobile/src/services/api.service.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

class APIService {
  constructor() {
    this.baseURL = __DEV__ 
      ? Platform.OS === 'ios' 
        ? 'http://localhost:5000' 
        : 'http://10.0.2.2:5000'
      : 'https://api.pramaan.app';
    
    this.timeout = 30000; // 30 seconds
  }

  async getAuthToken() {
    return await AsyncStorage.getItem('authToken');
  }

  async setAuthToken(token) {
    await AsyncStorage.setItem('authToken', token);
  }

  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const token = await this.getAuthToken();
      
      const config = {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': await DeviceInfo.getUniqueId(),
          'X-App-Version': DeviceInfo.getVersion(),
          'X-Platform': Platform.OS,
          ...options.headers,
          ...(token && { Authorization: `Bearer ${token}` })
        }
      };
      
      if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
      }
      
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Auth APIs
  async registerOrganization(data) {
    return this.request('/api/auth/register-organization', {
      method: 'POST',
      body: data
    });
  }

  async loginAdmin(email, password) {
    const response = await this.request('/api/auth/admin-login', {
      method: 'POST',
      body: { email, password }
    });
    
    if (response.token) {
      await this.setAuthToken(response.token);
    }
    
    return response;
  }

  async loginScholar(scholarId, organizationCode) {
    const response = await this.request('/api/auth/scholar-login', {
      method: 'POST',
      body: { scholarId, organizationCode }
    });
    
    if (response.token) {
      await this.setAuthToken(response.token);
    }
    
    return response;
  }

  async logout() {
    await AsyncStorage.multiRemove(['authToken', 'user', 'userRole']);
  }

  // Scholar APIs
  async registerScholar(data) {
    return this.request('/api/scholars/register', {
      method: 'POST',
      body: data
    });
  }

  async getScholarProfile(scholarId) {
    return this.request(`/api/scholars/${scholarId}/profile`);
  }

  async updateScholarProfile(scholarId, data) {
    return this.request(`/api/scholars/${scholarId}/profile`, {
      method: 'PUT',
      body: data
    });
  }

  async enrollBiometric(scholarId, biometricData) {
    return this.request(`/api/scholars/${scholarId}/biometric/enroll`, {
      method: 'POST',
      body: biometricData
    });
  }

  // Attendance APIs
  async generateAttendanceProof(data) {
    return this.request('/api/attendance/generate-proof', {
      method: 'POST',
      body: data
    });
  }

  async getAttendanceHistory(scholarId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/api/attendance/history/${scholarId}?${params}`);
  }

  async downloadCertificate(proofId) {
    const token = await this.getAuthToken();
    const url = `${this.baseURL}/api/attendance/certificate/${proofId}`;
    
    return {
      url,
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  // Organization APIs
  async getOrganizationSettings(organizationId) {
    return this.request(`/api/organizations/${organizationId}/settings`);
  }

  async updateOrganizationSettings(organizationId, settings) {
    return this.request(`/api/organizations/${organizationId}/settings`, {
      method: 'PUT',
      body: settings
    });
  }

  async getOrganizationStats(organizationId) {
    return this.request(`/api/organizations/${organizationId}/stats`);
  }

  // Admin APIs
  async getScholars(organizationId, page = 1, limit = 20) {
    return this.request(`/api/admin/scholars?page=${page}&limit=${limit}`);
  }

  async getDailyReport(date) {
    return this.request(`/api/admin/reports/daily?date=${date}`);
  }

  async getAttendanceAnalytics(startDate, endDate) {
    return this.request(`/api/admin/analytics/attendance?start=${startDate}&end=${endDate}`);
  }

  // File upload
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'photo.jpg'
    });
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
    
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    });
  }
}

export const apiService = new APIService();

