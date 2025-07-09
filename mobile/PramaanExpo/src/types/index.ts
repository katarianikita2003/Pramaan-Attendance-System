export interface Scholar {
 _id: string;
 name: string;
 email: string;
 scholarId: string;
 department?: string;
 year?: string;
 attendancePercentage?: number;
}

export interface Organization {
 _id: string;
 name: string;
 code: string;
 address: string;
 boundaries?: {
   center: {
     latitude: number;
     longitude: number;
   };
   radius: number;
 };
}

export interface AttendanceRecord {
 _id: string;
 scholarId: string;
 timestamp: string;
 location?: {
   latitude: number;
   longitude: number;
 };
 proof?: string;
 verified: boolean;
}

export interface Admin {
 _id: string;
 name: string;
 email: string;
 organizationId: string;
}