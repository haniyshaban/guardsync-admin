import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockGuards, mockSites, mockAttendanceLogs } from '@/data/mockData';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow, format, isSameDay } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GuardPage = () => {
  const { id } = useParams();
  const guard = mockGuards.find(g => g.id === id);

  if (!guard) {
    return (
      <DashboardLayout>
        <div className="p-6">Guard not found</div>
      </DashboardLayout>
    );
  }

  const site = guard.siteId ? mockSites.find(s => s.id === guard.siteId) : null;

  const attendance = mockAttendanceLogs.find(l => l.guardId === guard.id);
  const syntheticLogs = [
    {
      id: `evt-1-${guard.id}`,
      time: guard.lastSeen,
      text: `Last seen ${formatDistanceToNow(guard.lastSeen, { addSuffix: true })}`,
    },
  ];

  // Helper: determine if guard has clocked in today
  const hasClockedInToday = (() => {
    if (attendance && attendance.clockIn) return isSameDay(new Date(attendance.clockIn), new Date());
    if (guard.clockInTime) return isSameDay(new Date(guard.clockInTime), new Date());
    return false;
  })();

  // Helper: determine guard's assigned/current shift label
  const shiftInfo = (() => {
    if (!site || !site.shifts || site.shifts.length === 0) return null;
    // If guard has an explicit currentShiftId, prefer that
    if (guard.currentShiftId) {
      const s = site.shifts.find(sh => sh.id === guard.currentShiftId);
      if (s) return s;
    }
    // Otherwise, try to find a shift that matches current local time and day
    const now = new Date();
    const day = now.getDay();
    for (const sh of site.shifts) {
      if (!sh.daysOfWeek.includes(day)) continue;
      const [shH, shM] = sh.startTime.split(':').map(Number);
      const [ehH, ehM] = sh.endTime.split(':').map(Number);
      const start = new Date(now);
      start.setHours(shH, shM, 0, 0);
      const end = new Date(now);
      end.setHours(ehH, ehM, 0, 0);
      // handle overnight shift
      const inShift = start <= end ? (now >= start && now <= end) : (now >= start || now <= end);
      if (inShift) return sh;
    }
    // fallback to first shift
    return site.shifts[0] || null;
  })();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
              {guard.name.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{guard.name}</h2>
              <p className="text-sm text-muted-foreground">{guard.employeeId} • {guard.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={guard.status} className="capitalize">{guard.status}</Badge>
              {!hasClockedInToday && (
                <Badge variant="alert">Missed Check-in</Badge>
              )}
            </div>
            <Link to="/guards">
              <Button variant="outline">Back to guards</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Site</p>
                    <p className="font-medium">{site ? (
                      <Link to={`/manage-site/${site.id}`} className="text-primary underline">{site.name}</Link>
                    ) : 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Device</p>
                    <p className="font-medium">Android</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shift</p>
                    <p className="font-medium">{shiftInfo ? `${shiftInfo.label || 'Shift'} • ${shiftInfo.startTime} - ${shiftInfo.endTime}` : 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Location</p>
                    <p className="font-medium">{guard.location ? `${guard.location.lat.toFixed(5)}, ${guard.location.lng.toFixed(5)}` : 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Seen</p>
                    <p className="font-medium">{format(guard.lastSeen, 'PPpp')} ({formatDistanceToNow(guard.lastSeen, { addSuffix: true })})</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendance && (
                    <div className="p-3 border rounded">
                      <p className="text-sm text-muted-foreground">Clocked In</p>
                      <p className="font-medium">{format(attendance.clockIn, 'PPpp')} • {attendance.withinGeofence ? 'Within geofence' : 'Outside geofence'}</p>
                    </div>
                  )}

                  {syntheticLogs.map(l => (
                    <div key={l.id} className="p-3 border rounded">
                      <p className="text-xs text-muted-foreground">{format(l.time, 'PPpp')}</p>
                      <p className="font-medium">{l.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Last Known Location</CardTitle>
              </CardHeader>
              <CardContent>
                {guard.location ? (
                  <div className="h-56 w-full">
                    <MapContainer center={[guard.location.lat, guard.location.lng]} zoom={15} className="h-full rounded-md" scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[guard.location.lat, guard.location.lng]}>
                        <Popup>
                          {guard.name} <br /> {site?.name || 'Unknown site'}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No location data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GuardPage;
