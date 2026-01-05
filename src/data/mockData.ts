import { Guard, Site, AttendanceLog, SystemConfig, DashboardStats } from '@/types';

// Generate random coordinates around a center point
const generateRandomLocation = (centerLat: number, centerLng: number, radiusKm: number) => {
  const r = radiusKm * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const lat = centerLat + (r / 111) * Math.cos(theta);
  const lng = centerLng + (r / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(theta);
  return { lat, lng };
};

// Base location (Bangalore, India)
const baseLat = 12.9716;
const baseLng = 77.5946;

// Generate mock sites
export const mockSites: Site[] = [
  {
    id: 'site-1',
    name: 'Whitefield Tech Park',
    address: 'Whitefield, Bangalore',
    location: { lat: 12.9698, lng: 77.7491 },
    geofenceRadius: 100,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'site-2',
    name: 'Koramangala Mall Complex',
    address: 'Koramangala, Bangalore',
    location: { lat: 12.9350, lng: 77.6190 },
    geofenceRadius: 150,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'site-3',
    name: 'MG Road Business Center',
    address: 'MG Road, Bangalore',
    location: { lat: 12.9759, lng: 77.6050 },
    geofenceRadius: 100,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-02-10'),
  },
  {
    id: 'site-4',
    name: 'Electronic City Park',
    address: 'Electronic City, Bangalore',
    location: { lat: 12.8390, lng: 77.6770 },
    geofenceRadius: 120,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'site-5',
    name: 'Jayanagar Residences',
    address: 'Jayanagar, Bangalore',
    location: { lat: 12.9250, lng: 77.5838 },
    geofenceRadius: 200,
    assignedGuards: [],
    isActive: false,
    createdAt: new Date('2024-03-15'),
  },
];

// Indian first names and last names for realistic data
const firstNames = ['Rajesh', 'Amit', 'Suresh', 'Vikram', 'Anil', 'Deepak', 'Manish', 'Sanjay', 'Ravi', 'Prakash', 
  'Ramesh', 'Vijay', 'Manoj', 'Ashok', 'Sunil', 'Rakesh', 'Mukesh', 'Dinesh', 'Gopal', 'Harish'];
const lastNames = ['Kumar', 'Singh', 'Sharma', 'Verma', 'Gupta', 'Patel', 'Yadav', 'Chauhan', 'Thakur', 'Pandey',
  'Mishra', 'Joshi', 'Agarwal', 'Saxena', 'Malhotra', 'Kapoor', 'Mehta', 'Shah', 'Nair', 'Reddy'];

// Generate 50 mock guards for demo
export const mockGuards: Guard[] = Array.from({ length: 50 }, (_, i) => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const site = mockSites[Math.floor(Math.random() * mockSites.length)];
  const statusRandom = Math.random();
  
  let status: Guard['status'];
  if (statusRandom > 0.7) status = 'online';
  else if (statusRandom > 0.4) status = 'idle';
  else if (statusRandom > 0.15) status = 'offline';
  else status = 'alert';

  const location = site ? generateRandomLocation(site.location.lat, site.location.lng, 0.5) : null;

  return {
    id: `guard-${i + 1}`,
    name: `${firstName} ${lastName}`,
    phone: `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`,
    employeeId: `EMP${String(1000 + i).padStart(4, '0')}`,
    siteId: site?.id || null,
    status,
    lastSeen: new Date(Date.now() - Math.random() * 3600000 * 4),
    location,
    clockedIn: status === 'online' || status === 'idle',
    clockInTime: status === 'online' || status === 'idle' 
      ? new Date(Date.now() - Math.random() * 28800000) 
      : undefined,
  };
});

// Update sites with assigned guards
mockSites.forEach(site => {
  site.assignedGuards = mockGuards
    .filter(g => g.siteId === site.id)
    .map(g => g.id);
});

// Mock attendance logs for today
export const mockAttendanceLogs: AttendanceLog[] = mockGuards
  .filter(g => g.clockedIn)
  .map(guard => ({
    id: `log-${guard.id}`,
    guardId: guard.id,
    siteId: guard.siteId || 'site-1',
    clockIn: guard.clockInTime || new Date(),
    clockInLocation: guard.location || { lat: baseLat, lng: baseLng },
    withinGeofence: Math.random() > 0.1,
  }));

// System configuration
export const defaultSystemConfig: SystemConfig = {
  usePremiumAPIs: false,
  faceRecognition: 'local',
  mapProvider: 'openstreetmap',
  wakeUpIntervalHours: 2,
  geofenceDefaultRadius: 100,
  offlineSyncInterval: 5,
};

// Calculate dashboard stats
export const calculateDashboardStats = (guards: Guard[], sites: Site[]): DashboardStats => {
  return {
    totalGuards: guards.length,
    activeGuards: guards.filter(g => g.status === 'online').length,
    offlineGuards: guards.filter(g => g.status === 'offline').length,
    alertGuards: guards.filter(g => g.status === 'alert').length,
    totalSites: sites.length,
    activeSites: sites.filter(s => s.isActive).length,
  };
};
