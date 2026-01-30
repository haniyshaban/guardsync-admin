import { Guard, Site, AttendanceLog, SystemConfig, DashboardStats } from '@/types';

// Hardcoded initial demo sites (5 sites)
const initialSites: Site[] = [
  {
    id: 'site-1',
    name: 'Whitefield Tech Park',
    address: 'Whitefield, Bangalore',
    location: { lat: 12.9698, lng: 77.7491 },
    geofenceRadius: 200,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-01-15').toISOString(),
    shifts: [],
  },
  {
    id: 'site-2',
    name: 'Koramangala Mall Complex',
    address: 'Koramangala, Bangalore',
    location: { lat: 12.9350, lng: 77.6190 },
    geofenceRadius: 150,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-02-01').toISOString(),
    shifts: [],
  },
  {
    id: 'site-3',
    name: 'MG Road Business Center',
    address: 'MG Road, Bangalore',
    location: { lat: 12.9759, lng: 77.6050 },
    geofenceRadius: 100,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-02-10').toISOString(),
    shifts: [],
  },
  {
    id: 'site-4',
    name: 'Electronic City Park',
    address: 'Electronic City, Bangalore',
    location: { lat: 12.8390, lng: 77.6770 },
    geofenceRadius: 120,
    assignedGuards: [],
    isActive: true,
    createdAt: new Date('2024-03-01').toISOString(),
    shifts: [],
  },
  {
    id: 'site-5',
    name: 'Jayanagar Residences',
    address: 'Jayanagar, Bangalore',
    location: { lat: 12.9250, lng: 77.5838 },
    geofenceRadius: 200,
    assignedGuards: [],
    isActive: false,
    createdAt: new Date('2024-03-15').toISOString(),
    shifts: [],
  },
];

// Hardcoded initial guards (10 guards) with fixed starting points inside their site's geofence
const initialGuards: Guard[] = [
  { id: 'guard-1', name: 'Rajesh Kumar', phone: '+91 7000000001', employeeId: 'EMP1001', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9702, lng: 77.7494 }, locationHistory: [{ lat: 12.9702, lng: 77.7494, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-2', name: 'Amit Singh', phone: '+91 7000000002', employeeId: 'EMP1002', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9696, lng: 77.7489 }, locationHistory: [{ lat: 12.9696, lng: 77.7489, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-3', name: 'Suresh Sharma', phone: '+91 7000000003', employeeId: 'EMP1003', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9700, lng: 77.7490 }, locationHistory: [{ lat: 12.9700, lng: 77.7490, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-4', name: 'Vikram Verma', phone: '+91 7000000004', employeeId: 'EMP1004', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9699, lng: 77.7493 }, locationHistory: [{ lat: 12.9699, lng: 77.7493, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-5', name: 'Anil Gupta', phone: '+91 7000000005', employeeId: 'EMP1005', siteId: 'site-2', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9352, lng: 77.6192 }, locationHistory: [{ lat: 12.9352, lng: 77.6192, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-6', name: 'Deepak Patel', phone: '+91 7000000006', employeeId: 'EMP1006', siteId: 'site-2', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9348, lng: 77.6187 }, locationHistory: [{ lat: 12.9348, lng: 77.6187, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-7', name: 'Manish Kapoor', phone: '+91 7000000007', employeeId: 'EMP1007', siteId: 'site-2', status: 'alert', lastSeen: new Date().toISOString(), location: { lat: 12.9351, lng: 77.6194 }, locationHistory: [{ lat: 12.9351, lng: 77.6194, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-8', name: 'Sanjay Reddy', phone: '+91 7000000008', employeeId: 'EMP1008', siteId: 'site-3', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.9761, lng: 77.6052 }, locationHistory: [{ lat: 12.9761, lng: 77.6052, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-9', name: 'Ravi Nair', phone: '+91 7000000009', employeeId: 'EMP1009', siteId: 'site-3', status: 'offline', lastSeen: new Date().toISOString(), location: { lat: 12.9756, lng: 77.6048 }, locationHistory: [{ lat: 12.9756, lng: 77.6048, at: new Date().toISOString() }], clockedIn: false, clockInTime: undefined, currentShiftId: undefined },
  { id: 'guard-10', name: 'Prakash Mehta', phone: '+91 7000000010', employeeId: 'EMP1010', siteId: 'site-3', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.9758, lng: 77.6051 }, locationHistory: [{ lat: 12.9758, lng: 77.6051, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  // New guards for Electronic City (site-4)
  { id: 'guard-11', name: 'Arjun Rao', phone: '+91 7000000011', employeeId: 'EMP1011', siteId: 'site-4', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.83960, lng: 77.67720 }, locationHistory: [{ lat: 12.83960, lng: 77.67720, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-12', name: 'Priya Shetty', phone: '+91 7000000012', employeeId: 'EMP1012', siteId: 'site-4', status: 'alert', lastSeen: new Date().toISOString(), location: { lat: 12.83870, lng: 77.67660 }, locationHistory: [{ lat: 12.83870, lng: 77.67660, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-13', name: 'Sunil Das', phone: '+91 7000000013', employeeId: 'EMP1013', siteId: 'site-4', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.83920, lng: 77.67800 }, locationHistory: [{ lat: 12.83920, lng: 77.67800, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-14', name: 'Meena Iyer', phone: '+91 7000000014', employeeId: 'EMP1014', siteId: 'site-4', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.83890, lng: 77.67680 }, locationHistory: [{ lat: 12.83890, lng: 77.67680, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-15', name: 'Kiran Babu', phone: '+91 7000000015', employeeId: 'EMP1015', siteId: 'site-4', status: 'alert', lastSeen: new Date().toISOString(), location: { lat: 12.83940, lng: 77.67650 }, locationHistory: [{ lat: 12.83940, lng: 77.67650, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  // Additional guards to ensure at least 6 per site
  // site-1 (add 2)
  { id: 'guard-16', name: 'Naveen Rao', phone: '+91 7000000016', employeeId: 'EMP1016', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9697, lng: 77.7490 }, locationHistory: [{ lat: 12.9697, lng: 77.7490, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-17', name: 'Leena Rao', phone: '+91 7000000017', employeeId: 'EMP1017', siteId: 'site-1', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.9701, lng: 77.7492 }, locationHistory: [{ lat: 12.9701, lng: 77.7492, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  // site-2 (add 3)
  { id: 'guard-18', name: 'Rohit Menon', phone: '+91 7000000018', employeeId: 'EMP1018', siteId: 'site-2', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9353, lng: 77.6191 }, locationHistory: [{ lat: 12.9353, lng: 77.6191, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-19', name: 'Anita Rao', phone: '+91 7000000019', employeeId: 'EMP1019', siteId: 'site-2', status: 'alert', lastSeen: new Date().toISOString(), location: { lat: 12.9349, lng: 77.6189 }, locationHistory: [{ lat: 12.9349, lng: 77.6189, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-20', name: 'Vivek Sharma', phone: '+91 7000000020', employeeId: 'EMP1020', siteId: 'site-2', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9350, lng: 77.6195 }, locationHistory: [{ lat: 12.9350, lng: 77.6195, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  // site-3 (add 3)
  { id: 'guard-21', name: 'Karthik Iyer', phone: '+91 7000000021', employeeId: 'EMP1021', siteId: 'site-3', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9760, lng: 77.6050 }, locationHistory: [{ lat: 12.9760, lng: 77.6050, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-22', name: 'Priyanka Nair', phone: '+91 7000000022', employeeId: 'EMP1022', siteId: 'site-3', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.9757, lng: 77.6050 }, locationHistory: [{ lat: 12.9757, lng: 77.6050, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-23', name: 'Rahul Desai', phone: '+91 7000000023', employeeId: 'EMP1023', siteId: 'site-3', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9759, lng: 77.6052 }, locationHistory: [{ lat: 12.9759, lng: 77.6052, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  // site-4 (add 1)
  // site-5 (add 6)
  { id: 'guard-25', name: 'Sandeep Kulkarni', phone: '+91 7000000025', employeeId: 'EMP1025', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9700, lng: 77.7490 }, locationHistory: [{ lat: 12.9700, lng: 77.7490, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-26', name: 'Nisha Rao', phone: '+91 7000000026', employeeId: 'EMP1026', siteId: 'site-2', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9351, lng: 77.6190 }, locationHistory: [{ lat: 12.9351, lng: 77.6190, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-27', name: 'Vijay Kumar', phone: '+91 7000000027', employeeId: 'EMP1027', siteId: 'site-3', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.9760, lng: 77.6050 }, locationHistory: [{ lat: 12.9760, lng: 77.6050, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-24', name: 'Rina Thomas', phone: '+91 7000000024', employeeId: 'EMP1024', siteId: 'site-4', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.83880, lng: 77.67760 }, locationHistory: [{ lat: 12.83880, lng: 77.67760, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-29', name: 'Suresh Nair', phone: '+91 7000000029', employeeId: 'EMP1029', siteId: 'site-1', status: 'online', lastSeen: new Date().toISOString(), location: { lat: 12.9703, lng: 77.7495 }, locationHistory: [{ lat: 12.9703, lng: 77.7495, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-28', name: 'Anu Menon', phone: '+91 7000000028', employeeId: 'EMP1028', siteId: 'site-4', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.83900, lng: 77.67690 }, locationHistory: [{ lat: 12.83900, lng: 77.67690, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
  { id: 'guard-30', name: 'Geeta Sharma', phone: '+91 7000000030', employeeId: 'EMP1030', siteId: 'site-2', status: 'idle', lastSeen: new Date().toISOString(), location: { lat: 12.9349, lng: 77.6192 }, locationHistory: [{ lat: 12.9349, lng: 77.6192, at: new Date().toISOString() }], clockedIn: true, clockInTime: new Date().toISOString(), currentShiftId: undefined },
];

// Export mutable arrays used across the app. These will be mutated by the simulation hook.
export const mockSites: Site[] = initialSites.map(s => ({ ...s }));
export const mockGuards: Guard[] = initialGuards.map(g => ({ ...g }));

// Default shifts
const defaultShifts = [
  { id: 'shift-day', label: 'Day', startTime: '08:00', endTime: '20:00', daysOfWeek: [1,2,3,4,5,6] },
  { id: 'shift-night', label: 'Night', startTime: '20:00', endTime: '08:00', daysOfWeek: [0,6] }
];

// Apply default shifts per site
mockSites.forEach((s, si) => { s.shifts = defaultShifts.map(ds => ({ ...ds, id: `${ds.id}-${si + 1}` })); });

// Update sites with assigned guards
mockSites.forEach(site => {
  site.assignedGuards = mockGuards.filter(g => g.siteId === site.id).map(g => g.id);
});

// Export a reset function to restore initial demo positions
export function resetDemoData() {
  // reset guards in-place
  mockGuards.length = 0;
  initialGuards.forEach(g => mockGuards.push({ ...g }));
  // reset sites' assigned guards
  mockSites.forEach(site => {
    site.assignedGuards = mockGuards.filter(g => g.siteId === site.id).map(g => g.id);
  });
  try { window.dispatchEvent(new CustomEvent('guards-updated')); } catch (e) {}
}

// Mock attendance logs for today
export const mockAttendanceLogs: AttendanceLog[] = mockGuards
  .filter(g => g.clockedIn)
  .map(guard => ({
    id: `log-${guard.id}`,
    guardId: guard.id,
    siteId: guard.siteId || 'site-1',
    clockIn: guard.clockInTime || new Date().toISOString(),
    clockInLocation: guard.location || { lat: 12.9716, lng: 77.5946 },
    withinGeofence: true,
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
