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

// Ensure at least one panic guard for demo purposes unless the demo panic
// has been dismissed by the user (stored in localStorage). This prevents
// the panic from reappearing immediately after dismissing it.
try {
  const dismissed = typeof window !== 'undefined' && window.localStorage.getItem('demo_panic_dismissed') === '1';
  if (!dismissed && !mockGuards.some(g => g.status === 'panic')) {
    const idx = 0;
    mockGuards[idx].status = 'panic';
    mockGuards[idx].clockedIn = true;
    mockGuards[idx].clockInTime = new Date();
    mockGuards[idx].lastSeen = new Date();
  }
} catch (e) {
  // ignore storage errors in non-browser environments
}

// Populate locationHistory for every guard so movement trails are visible on the map.
// We'll create a gently trailing path (older -> newer) by interpolating from an earlier point
// towards the guard's current location and adding small jitter so the polyline is visible.
// Assign default shifts to each site and assign a shift to each assigned guard.
const defaultShifts = [
  { id: 'shift-day', label: 'Day', startTime: '08:00', endTime: '20:00', daysOfWeek: [1,2,3,4,5,6] },
  { id: 'shift-night', label: 'Night', startTime: '20:00', endTime: '08:00', daysOfWeek: [0,6] }
];

// Apply default shifts per site (clone per site)
mockSites.forEach((s, si) => {
  s.shifts = defaultShifts.map(ds => ({ ...ds, id: `${ds.id}-${si + 1}` }));
});

// Ensure two guards remain unassigned
if (mockGuards.length >= 2) {
  const lastIdx = mockGuards.length - 1;
  mockGuards[lastIdx].siteId = null as any;
  mockGuards[lastIdx - 1].siteId = null as any;
}

// Assign shifts to assigned guards
const assignedGuardShiftMappings: { guardId: string; shiftId: string }[] = [];
mockGuards.forEach((g, gi) => {
  try {
    // location history
    if (g.location) {
      const pts: { lat: number; lng: number; at: Date }[] = [];
      // choose a starting offset (older point) a few tens to a few hundred meters away
      const startOffsetMeters = 30 + (gi * 17) % 220; // vary per guard
      const metersToDeg = (meters: number) => meters / 111320; // rough conversion
      const startLat = g.location.lat + metersToDeg(startOffsetMeters * (Math.random() > 0.5 ? 1 : -1));
      const startLng = g.location.lng + metersToDeg(startOffsetMeters * (Math.random() > 0.5 ? 1 : -1)) / Math.cos(g.location.lat * Math.PI / 180);

      const now = Date.now();
      // vary count so some guards have shorter/longer trails
      const count = 8 + (gi % 8); // between 8 and 15 points
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, (count - 1));
        // smooth interpolation with a small easing so points accelerate towards current
        const ease = t * t * (3 - 2 * t);
        const lat = startLat + (g.location.lat - startLat) * ease + (Math.random() - 0.5) * 0.00008;
        const lng = startLng + (g.location.lng - startLng) * ease + (Math.random() - 0.5) * 0.00008;
        // timestamp older -> newer (spacing 10-30s per point)
        const spacing = 10000 + Math.floor(Math.random() * 20000);
        pts.push({ lat, lng, at: new Date(now - (count - 1 - i) * spacing) });
      }
      g.locationHistory = pts;
    }

    // assign a shift if guard has a site
    if (g.siteId) {
      const site = mockSites.find(s => s.id === g.siteId);
      if (site && Array.isArray(site.shifts) && site.shifts.length > 0) {
        const chosen = site.shifts[Math.floor(Math.random() * site.shifts.length)];
        assignedGuardShiftMappings.push({ guardId: g.id, shiftId: chosen.id });
        g.currentShiftId = chosen.id;
      }
    }
  } catch (e) {
    // ignore
  }
});

// Attach assignedGuardShifts to sites
mockSites.forEach(site => {
  const mappings = assignedGuardShiftMappings.filter(m => {
    const g = mockGuards.find(gg => gg.id === m.guardId);
    return g && g.siteId === site.id;
  });
  site.assignedGuardShifts = mappings;
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
