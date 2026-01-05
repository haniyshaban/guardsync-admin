export type GuardStatus = 'online' | 'offline' | 'idle' | 'alert';

export interface Guard {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
  siteId: string | null;
  status: GuardStatus;
  lastSeen: Date;
  location: {
    lat: number;
    lng: number;
  } | null;
  avatar?: string;
  clockedIn: boolean;
  clockInTime?: Date;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  geofenceRadius: number; // in meters
  assignedGuards: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface AttendanceLog {
  id: string;
  guardId: string;
  siteId: string;
  clockIn: Date;
  clockOut?: Date;
  clockInLocation: {
    lat: number;
    lng: number;
  };
  clockOutLocation?: {
    lat: number;
    lng: number;
  };
  clockInSelfie?: string;
  clockOutSelfie?: string;
  withinGeofence: boolean;
  notes?: string;
}

export interface WakeUpAlert {
  id: string;
  guardId: string;
  sentAt: Date;
  respondedAt?: Date;
  status: 'pending' | 'acknowledged' | 'missed';
}

export interface SystemConfig {
  usePremiumAPIs: boolean;
  faceRecognition: 'local' | 'aws-rekognition';
  mapProvider: 'openstreetmap' | 'google-maps';
  wakeUpIntervalHours: number;
  geofenceDefaultRadius: number;
  offlineSyncInterval: number;
}

export interface DashboardStats {
  totalGuards: number;
  activeGuards: number;
  offlineGuards: number;
  alertGuards: number;
  totalSites: number;
  activeSites: number;
}
