export type GuardStatus = 'online' | 'offline' | 'idle' | 'alert' | 'panic' | 'pending';

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
  // assigned/current shift id (optional)
  currentShiftId?: string;
  // Shift type: day or night
  shiftType?: 'day' | 'night';
  shiftStartTime?: string;
  shiftEndTime?: string;
  // Optional movement breadcrumb history (most recent last)
  locationHistory?: { lat: number; lng: number; at?: Date }[];
  lastPinged?: Date;
}

export interface PatrolCheckpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  order: number;
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
  geofenceType?: 'radius' | 'polygon';
  geofencePolygon?: { lat: number; lng: number }[];
  assignedGuards: string[];
  // site-level shift definitions
  shifts?: Shift[];
  // mapping of assigned guard -> shift at this site
  assignedGuardShifts?: { guardId: string; shiftId: string }[];
  isActive: boolean;
  createdAt: Date;
  // Patrol route checkpoints for this site
  patrolRoute?: PatrolCheckpoint[];
}

export interface Shift {
  id: string;
  label?: string;
  // ISO-like local times in HH:mm format
  startTime: string;
  endTime: string;
  // daysOfWeek: 0 (Sunday) - 6 (Saturday)
  daysOfWeek: number[];
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
