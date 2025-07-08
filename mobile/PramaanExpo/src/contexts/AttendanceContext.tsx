import React, { createContext, useState, useContext, ReactNode } from 'react';
import api from '../services/api';
import offlineService from '../services/offline';
import { useAuth } from './AuthContext';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent';
  zkProof?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  percentage: number;
  todayStatus: boolean;
}

interface AttendanceContextType {
  records: AttendanceRecord[];
  stats: AttendanceStats | null;
  loading: boolean;
  markAttendance: (data: any) => Promise<void>;
  fetchAttendanceHistory: () => Promise<void>;
  fetchAttendanceStats: () => Promise<void>;
  syncOfflineAttendance: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within AttendanceProvider');
  }
  return context;
};

interface AttendanceProviderProps {
  children: ReactNode;
}

export const AttendanceProvider: React.FC<AttendanceProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  const markAttendance = async (data: any) => {
    try {
      setLoading(true);
      
      // Try online first
      try {
        const response = await api.markAttendance({
          ...data,
          scholarId: user?.scholarId || user?.id
        });
        
        // Update local state
        setRecords(prev => [response.attendance, ...prev]);
        
        // Update stats
        if (stats) {
          setStats({
            ...stats,
            presentDays: stats.presentDays + 1,
            percentage: Math.round(((stats.presentDays + 1) / stats.totalDays) * 100),
            todayStatus: true
          });
        }
      } catch (error) {
        // If offline, save for later sync
        await offlineService.saveOfflineAttendance({
          ...data,
          scholarId: user?.scholarId || user?.id,
          timestamp: new Date().toISOString()
        });
        throw new Error('Attendance saved offline. Will sync when connection is restored.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.getAttendanceHistory(user.scholarId || user.id);
      setRecords(response.records);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      // Load from offline storage if available
      const offlineRecords = await offlineService.getOfflineAttendanceRecords();
      setRecords(offlineRecords);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.getAttendanceStats(user.scholarId || user.id);
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineAttendance = async () => {
    try {
      const pendingRecords = await offlineService.getPendingAttendance();
      
      for (const record of pendingRecords) {
        try {
          await api.markAttendance(record);
          await offlineService.removeSyncedAttendance(record.id);
        } catch (error) {
          console.error('Error syncing record:', error);
        }
      }
      
      // Refresh data after sync
      await fetchAttendanceHistory();
      await fetchAttendanceStats();
    } catch (error) {
      console.error('Error syncing offline attendance:', error);
    }
  };

  const value: AttendanceContextType = {
    records,
    stats,
    loading,
    markAttendance,
    fetchAttendanceHistory,
    fetchAttendanceStats,
    syncOfflineAttendance
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};