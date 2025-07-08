<<<<<<< Updated upstream
﻿// mobile/PramaanMobile/src/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://api.pramaan.app/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      await AsyncStorage.setItem('authToken', token);
      this.token = token;
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  private async clearToken() {
    try {
      await AsyncStorage.removeItem('authToken');
      this.token = null;
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
=======
class ApiService {
  async adminLogin(email, password) {
    try {
      const response = await fetch('http://10.0.2.2:5000/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return await response.json();
    } catch (error) {
>>>>>>> Stashed changes
      console.error('API Error:', error);
      throw error;
    }
  }
<<<<<<< Updated upstream

  // Auth endpoints
  async adminLogin(email: string, password: string) {
    const response = await this.request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      await this.saveToken(response.token);
    }

    return response;
  }

  async scholarLogin(scholarId: string, organizationCode: string, biometricData: any) {
    const response = await this.request('/auth/scholar-login', {
      method: 'POST',
      body: JSON.stringify({ scholarId, organizationCode, biometricData }),
    });

    if (response.token) {
      await this.saveToken(response.token);
    }

    return response;
  }

  async logout() {
    await this.clearToken();
  }

  // Organization endpoints
  async registerOrganization(data: any) {
    return this.request('/organizations/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganizationDetails() {
    return this.request('/organizations/details');
  }

  // Scholar endpoints
  async addScholar(data: any) {
    return this.request('/scholars/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getScholarProfile(id: string) {
    return this.request(`/scholars/${id}/profile`);
  }

  async enrollBiometric(scholarId: string, type: string, biometricData: any) {
    return this.request(`/scholars/${scholarId}/biometric/enroll`, {
      method: 'POST',
      body: JSON.stringify({ type, biometricData }),
    });
  }

  // Attendance endpoints
  async markAttendance(data: any) {
    return this.request('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAttendanceHistory(scholarId: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/attendance/history/${scholarId}?${queryString}`);
  }

  async getAttendanceStats(scholarId: string) {
    return this.request(`/attendance/stats/${scholarId}`);
  }

  async generateCertificate(scholarId: string, period: any) {
    return this.request('/attendance/certificate', {
      method: 'POST',
      body: JSON.stringify({ scholarId, period }),
    });
  }

  // Admin endpoints
  async getOrganizationStats() {
    return this.request('/admin/stats');
  }

  async getScholars(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/scholars?${queryString}`);
  }

  async getAttendanceReports(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/reports?${queryString}`);
  }
}

export default new ApiService();
=======
  
  async registerOrganization(data) {
    try {
      const response = await fetch('http://10.0.2.2:5000/api/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

export default new ApiService();
>>>>>>> Stashed changes
