import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockSites, mockGuards } from '@/data/mockData';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { MapContainer, TileLayer, Marker, Polygon, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ManageSitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const siteId = String(id || '');

  const initialSite = useMemo(() => mockSites.find(s => s.id === siteId) || null, [siteId]);
  const [site, setSite] = useState<any>(initialSite);
  const [name, setName] = useState(site?.name || '');
  const [isActive, setIsActive] = useState<boolean>(!!site?.isActive);
  const [assignedGuardIds, setAssignedGuardIds] = useState<string[]>(site?.assignedGuards?.slice() || []);
  const [assignedGuardShifts, setAssignedGuardShifts] = useState<{ guardId: string; shiftId: string }[]>(site?.assignedGuardShifts?.slice() || []);
  const [selectedAddGuard, setSelectedAddGuard] = useState<string>('');
  const [selectedAddGuardShift, setSelectedAddGuardShift] = useState<string>('');
  const defaultShifts = [
    { id: 'shift-day', label: 'Day', startTime: '08:00', endTime: '20:00', daysOfWeek: [1,2,3,4,5,6,7] },
    { id: 'shift-night', label: 'Night', startTime: '20:00', endTime: '08:00', daysOfWeek: [1,2,3,4,5,6,7] }
  ];
  const [siteShifts, setSiteShifts] = useState<any[]>(site?.shifts?.slice() || defaultShifts);
  const [geofenceMode, setGeofenceMode] = useState<'radius' | 'polygon'>(site?.geofenceType || 'radius');
  const [radiusValue, setRadiusValue] = useState<number>(site?.geofenceRadius || 100);
  const [polygonText, setPolygonText] = useState<string>(site?.geofencePolygon ? JSON.stringify(site.geofencePolygon, null, 2) : '');
  const [polygonPoints, setPolygonPoints] = useState<{lat:number;lng:number}[]>(site?.geofencePolygon ? site.geofencePolygon.map((p:any)=>({lat:Number(p.lat), lng:Number(p.lng)})) : []);

  useEffect(() => {
    if (!initialSite) return;
    setSite(initialSite);
    setName(initialSite.name);
    setIsActive(!!initialSite.isActive);
    setAssignedGuardIds(initialSite.assignedGuards?.slice() || []);
    setAssignedGuardShifts(initialSite.assignedGuardShifts?.slice() || []);
    setSiteShifts(initialSite.shifts?.slice() || defaultShifts);
    setGeofenceMode(initialSite.geofenceType || 'radius');
    setRadiusValue(initialSite.geofenceRadius || 100);
    setPolygonText(initialSite.geofencePolygon ? JSON.stringify(initialSite.geofencePolygon, null, 2) : '');
    setPolygonPoints(initialSite.geofencePolygon ? initialSite.geofencePolygon.map((p:any)=>({lat:Number(p.lat), lng:Number(p.lng)})) : []);
  }, [initialSite]);

  if (!site) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Site not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">The requested site does not exist.</p>
              <div className="mt-4">
                <Link to="/sites">
                  <Button variant="outline">Back to Sites</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const assignedGuards = mockGuards.filter(g => assignedGuardIds.includes(g.id));
  const availableGuards = mockGuards.filter(g => !assignedGuardIds.includes(g.id));

  function saveChanges() {
    try {
      // update mockSites in-memory
      const idx = mockSites.findIndex(ms => ms.id === site.id);
      // prepare geofence payload
      const updatedGeofence: any = {};
      updatedGeofence.geofenceType = geofenceMode;
      if (geofenceMode === 'radius') {
        updatedGeofence.geofenceRadius = Number(radiusValue) || 0;
        updatedGeofence.geofencePolygon = undefined;
      } else {
        // prefer drawn polygon points, fallback to parsed JSON
        if (polygonPoints && polygonPoints.length > 0) {
          updatedGeofence.geofencePolygon = polygonPoints.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }));
        } else {
          try {
            const parsed = JSON.parse(polygonText);
            if (Array.isArray(parsed)) {
              updatedGeofence.geofencePolygon = parsed.map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
            }
          } catch (err) {
            // ignore
          }
        }
        updatedGeofence.geofenceRadius = undefined;
      }

      if (idx >= 0) {
        mockSites[idx] = { ...mockSites[idx], name, isActive, assignedGuards: assignedGuardIds, shifts: siteShifts, assignedGuardShifts: assignedGuardShifts, ...updatedGeofence };
      } else {
        mockSites.push({ ...site, name, isActive, assignedGuards: assignedGuardIds, shifts: siteShifts, assignedGuardShifts: assignedGuardShifts, ...updatedGeofence });
      }

      // update mockGuards assignments and shift ids in-memory
      mockGuards.forEach(g => {
        const assigned = assignedGuardIds.includes(g.id);
        if (assigned) {
          g.siteId = site.id;
          const mapping = assignedGuardShifts.find(a => a.guardId === g.id);
          if (mapping) g.currentShiftId = mapping.shiftId;
        } else if (g.siteId === site.id && !assigned) {
          g.siteId = null as any;
          g.currentShiftId = undefined;
        }
      });

      // persist sites to localStorage for cross-page visibility
      try {
        localStorage.setItem('gw_sites', JSON.stringify(mockSites));
      } catch (err) {
        // ignore
      }

      // refresh local `site` state so UI reflects saved values while staying on page
      const refreshed = mockSites.find(ms => ms.id === site.id);
      if (refreshed) setSite(refreshed);

      alert('Site saved');
    } catch (err) {
      alert('Failed to save site');
    }
  }

  function removeGuard(guardId: string) {
    setAssignedGuardIds(prev => prev.filter(id => id !== guardId));
    setAssignedGuardShifts(prev => prev.filter(p => p.guardId !== guardId));
    const g = mockGuards.find(x => x.id === guardId);
    if (g && g.siteId === site.id) {
      g.siteId = null as any;
      g.currentShiftId = undefined;
    }
  }

  function addGuard() {
    if (!selectedAddGuard) return;
    if (!selectedAddGuardShift) {
      alert('Please select a shift when assigning a guard.');
      return;
    }
    setAssignedGuardIds(prev => [...prev, selectedAddGuard]);
    setAssignedGuardShifts(prev => [...prev, { guardId: selectedAddGuard, shiftId: selectedAddGuardShift }]);
    const g = mockGuards.find(x => x.id === selectedAddGuard);
    if (g) {
      g.siteId = site.id;
      g.currentShiftId = selectedAddGuardShift;
    }
    setSelectedAddGuard('');
    setSelectedAddGuardShift('');
  }

  function deleteSite() {
    if (!site) return;
    const ok = window.confirm('Delete site "' + site.name + '"? This will remove the site and unassign its guards.');
    if (!ok) return;
    try {
      const idx = mockSites.findIndex(ms => ms.id === site.id);
      if (idx >= 0) mockSites.splice(idx, 1);
      // unassign guards
      mockGuards.forEach(g => {
        if (g.siteId === site.id) g.siteId = null as any;
      });
      try { localStorage.setItem('gw_sites', JSON.stringify(mockSites)); } catch (e) {}
      alert('Site deleted');
      navigate('/sites');
    } catch (err) {
      alert('Failed to delete site');
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Manage Site — {site.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Site Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <div className="mt-2">
                      <Button variant={isActive ? 'glow' : 'outline'} size="sm" onClick={() => setIsActive(true)} className="mr-2">Active</Button>
                      <Button variant={!isActive ? 'outline' : 'ghost'} size="sm" onClick={() => setIsActive(false)}>Inactive</Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Assigned Guards</label>
                    <div className="mt-2 space-y-2">
                      {assignedGuards.length === 0 && (
                        <div className="text-sm text-muted-foreground">No guards assigned</div>
                      )}
                      {assignedGuards.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                          <div>
                            <div className="font-medium">{g.name}</div>
                            <div className="text-xs text-muted-foreground">{g.employeeId} • {g.phone}</div>
                            <div className="text-xs text-muted-foreground">Shift: {(() => {
                              const mapping = assignedGuardShifts.find(a => a.guardId === g.id);
                              const s = mapping ? siteShifts.find(ss => ss.id === mapping.shiftId) : null;
                              return s ? (s.label || `${s.startTime}-${s.endTime}`) : '—';
                            })()}</div>
                          </div>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => removeGuard(g.id)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2 items-center">
                        <select className="flex-1 p-2 rounded border bg-white text-foreground text-sm" style={{color: '#0f172a'}} value={selectedAddGuard} onChange={(e) => setSelectedAddGuard(e.target.value)}>
                        <option value="">Select guard to add</option>
                        {availableGuards.map(g => (
                          <option key={g.id} value={g.id} style={{ color: '#0f172a', background: '#ffffff' }}>{g.name} — {g.employeeId}</option>
                        ))}
                      </select>
                      <select className="w-48 p-2 rounded border bg-white text-foreground text-sm" value={selectedAddGuardShift} onChange={(e) => setSelectedAddGuardShift(e.target.value)}>
                        <option value="">Select shift</option>
                        {siteShifts.map(s => (
                          <option key={s.id} value={s.id} style={{ color: '#0f172a', background: '#ffffff' }}>{s.label || `${s.startTime}-${s.endTime}`}</option>
                        ))}
                      </select>
                      <Button onClick={addGuard} disabled={!selectedAddGuard || !selectedAddGuardShift}>Add</Button>
                    </div>
                  </div>

                  
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Geofence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Geofence Mode</div>
                  <RadioGroup value={geofenceMode} onValueChange={(v: any) => setGeofenceMode(v)} className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="radius" />
                      <span>Radius (meters)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="polygon" />
                      <span>Custom Polygon</span>
                    </label>
                  </RadioGroup>

                  {geofenceMode === 'radius' && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Radius (meters)</div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={10}
                          max={2000}
                          value={radiusValue}
                          onChange={(e) => setRadiusValue(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="w-20 text-right font-mono">{radiusValue} m</div>
                      </div>

                      <div className="mt-3 w-full h-40 rounded-md overflow-hidden border">
                        <MapContainer center={[site.location.lat || 12.97, site.location.lng || 77.59]} zoom={15} className="w-full h-full">
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Circle center={[site.location.lat, site.location.lng]} radius={Number(radiusValue)} pathOptions={{ color: 'hsl(192, 95%, 50%)', fillOpacity: 0.08 }} />
                        </MapContainer>
                      </div>
                    </div>
                  )}

                  {geofenceMode === 'polygon' && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Draw polygon on map (click to add points)</div>
                      <div className="w-full h-72 rounded-md overflow-hidden border">
                        <MapContainer center={[site.location.lat || 12.97, site.location.lng || 77.59]} zoom={13} className={`w-full h-full ${geofenceMode === 'polygon' ? 'cursor-pin' : ''}`}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Polygon positions={polygonPoints.map(p => [p.lat, p.lng]) as any} pathOptions={{ color: 'blue', fillOpacity: 0.1 }} />
                            {polygonPoints.map((p, i) => (
                              <Marker key={i} position={[p.lat, p.lng]} />
                            ))}
                            {mockGuards.filter(g => g.siteId === site.id && g.location).map(g => (
                              <Marker key={g.id} position={[g.location!.lat, g.location!.lng]} icon={L.divIcon({
                                className: 'small-guard-marker',
                                html: `<div style="width:10px;height:10px;border-radius:50%;background:${g.status==='online'? '#22c55e': g.status==='idle'? '#f59e0b': g.status==='alert'? '#dc2626':'#ef4444'};border:2px solid white"></div>`,
                                iconSize: [12,12],
                                iconAnchor: [6,6]
                              })} />
                            ))}
                          <MapClickHandler onClick={(lat,lng) => setPolygonPoints(prev => [...prev, {lat,lng}])} />
                        </MapContainer>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setPolygonPoints(prev => prev.slice(0,-1))}>Undo</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPolygonPoints([])}>Clear</Button>
                        <div className="text-xs text-muted-foreground ml-auto">You can also paste JSON below</div>
                      </div>
                      <Textarea value={polygonText} onChange={(e) => setPolygonText(e.target.value)} rows={3} className="mt-2" />
                    </div>
                  )}
                  
                  {/* Save actions under the map */}
                  <div className="mt-4">
                    <Button onClick={saveChanges} className="w-full h-10">Save</Button>
                    <Button variant="outline" onClick={() => navigate('/sites')} className="w-full mt-2">Cancel</Button>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Danger zone: moved lower so user must scroll to reach it */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Deleting a site removes it and will unassign any guards. This action is irreversible.</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={deleteSite}
                  className="w-full sm:w-1/5 text-left border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 hover:border-red-300 focus:text-red-700"
                >
                  Delete site
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Map click handler to capture clicks and pass lat/lng to parent
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}
