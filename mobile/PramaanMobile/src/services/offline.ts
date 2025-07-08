import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';

interface OfflineAttendance {
  id: string;
  scholarId: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  biometricSignature: string;
  zkProof?: string;
  synced: boolean;
}

class OfflineService {
  private readonly OFFLINE_ATTENDANCE_KEY = 'offline_attendance';
  private readonly CACHE_PREFIX = 'cache_';
  private isOnline = true;

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected || false;
      
      if (this.isOnline) {
        // Trigger sync when coming back online
        this.syncPendingData();
      }
    });
  }

  async saveOfflineAttendance(data: any): Promise<void> {
    try {
      const offlineRecord: OfflineAttendance = {
        id: uuidv4(),
        scholarId: data.scholarId,
        timestamp: data.timestamp,
        location: data.location,
        biometricSignature: data.biometricSignature,
        zkProof: data.zkProof,
        synced: false
      };

      const existing = await this.getOfflineAttendance();
      existing.push(offlineRecord);
      
      await AsyncStorage.setItem(
        this.OFFLINE_ATTENDANCE_KEY,
        JSON.stringify(existing)
      );
    } catch (error) {
      console.error('Error saving offline attendance:', error);
      throw error;
    }
  }

  async getOfflineAttendance(): Promise<OfflineAttendance[]> {
    try {
      const data = await AsyncStorage.getItem(this.OFFLINE_ATTENDANCE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline attendance:', error);
      return [];
    }
  }

  async getPendingAttendance(): Promise<OfflineAttendance[]> {
    const all = await this.getOfflineAttendance();
    return all.filter(record => !record.synced);
  }

  async removeSyncedAttendance(id: string): Promise<void> {
    try {
      const all = await this.getOfflineAttendance();
      const updated = all.map(record => 
        record.id === id ? { ...record, synced: true } : record
      );
      
      await AsyncStorage.setItem(
        this.OFFLINE_ATTENDANCE_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Error removing synced attendance:', error);
    }
  }

  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl: ttl || 3600000 // Default 1 hour
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  async getCachedData(key: string): Promise<any | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { data, timestamp, ttl } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > ttl) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async syncPendingData(): Promise<void> {
    // This will be called by the AttendanceContext
    console.log('Syncing pending offline data...');
  }

  async getOfflineAttendanceRecords(): Promise<any[]> {
    // Convert offline records to match the expected format
    const offlineRecords = await this.getOfflineAttendance();
    
    return offlineRecords.map(record => ({
      id: record.id,
      date: record.timestamp,
      checkIn: new Date(record.timestamp).toLocaleTimeString(),
      checkOut: '-',
      status: 'present',
      duration: '-',
      isOffline: true
    }));
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }
}

export default new OfflineService();