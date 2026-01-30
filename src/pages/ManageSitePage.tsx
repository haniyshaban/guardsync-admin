import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockSites, mockGuards } from '@/data/mockData';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { MapContainer, TileLayer, Marker, Polygon, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface PatrolCheckpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  order: number;
}

export default function ManageSitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const siteId = String(id || '');

  const initialSite = useMemo(() => mockSites.find(s => s.id === siteId) || null, [siteId]);
  const [site, setSite] = useState<any>(initialSite);
  const [name, setName] = useState(site?.name || '');
  const [isActive, setIsActive] = useState<boolean>(!!site?.isActive);
  const [assignedGuardIds, setAssignedGuardIds] = useState<string[]>(site?.assignedGuards?.slice() || []);
  const [selectedAddGuard, setSelectedAddGuard] = useState<string>('');
  const [geofenceMode, setGeofenceMode] = useState<'radius' | 'polygon'>(site?.geofenceType || 'radius');
  const [radiusValue, setRadiusValue] = useState<number>(site?.geofenceRadius || 100);
  const [polygonText, setPolygonText] = useState<string>(site?.geofencePolygon ? JSON.stringify(site.geofencePolygon, null, 2) : '');
  const [polygonPoints, setPolygonPoints] = useState<{lat:number;lng:number}[]>(site?.geofencePolygon ? site.geofencePolygon.map((p:any)=>({lat:Number(p.lat), lng:Number(p.lng)})) : []);
  
  // Patrol route state
  const [patrolCheckpoints, setPatrolCheckpoints] = useState<PatrolCheckpoint[]>(site?.patrolRoute || []);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointRadius, setNewCheckpointRadius] = useState(15);
  const [patrolEditMode, setPatrolEditMode] = useState(false);

  useEffect(() => {
    if (!initialSite) return;
    setSite(initialSite);
    setName(initialSite.name);
    setIsActive(!!initialSite.isActive);
    setAssignedGuardIds(initialSite.assignedGuards?.slice() || []);
    setGeofenceMode(initialSite.geofenceType || 'radius');
    setRadiusValue(initialSite.geofenceRadius || 100);
    setPolygonText(initialSite.geofencePolygon ? JSON.stringify(initialSite.geofencePolygon, null, 2) : '');
    setPolygonPoints(initialSite.geofencePolygon ? initialSite.geofencePolygon.map((p:any)=>({lat:Number(p.lat), lng:Number(p.lng)})) : []);
    setPatrolCheckpoints(initialSite.patrolRoute || []);
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
        mockSites[idx] = { ...mockSites[idx], name, isActive, assignedGuards: assignedGuardIds, patrolRoute: patrolCheckpoints, ...updatedGeofence };
      } else {
        mockSites.push({ ...site, name, isActive, assignedGuards: assignedGuardIds, patrolRoute: patrolCheckpoints, ...updatedGeofence });
      }

      // update mockGuards assignments in-memory
      mockGuards.forEach(g => {
        if (assignedGuardIds.includes(g.id)) {
          g.siteId = site.id;
        } else if (g.siteId === site.id && !assignedGuardIds.includes(g.id)) {
          g.siteId = null as any;
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
  }

  function addGuard() {
    if (!selectedAddGuard) return;
    setAssignedGuardIds(prev => [...prev, selectedAddGuard]);
    setSelectedAddGuard('');
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
                          <option key={g.id} value={g.id}>{g.name} — {g.employeeId}</option>
                        ))}
                      </select>
                      <Button onClick={addGuard} disabled={!selectedAddGuard}>Add</Button>
                    </div>
                  </div>

                  {/* Patrol Route Editor */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm text-muted-foreground font-medium">Patrol Route Checkpoints</label>
                      <Button
                        variant={patrolEditMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPatrolEditMode(!patrolEditMode)}
                      >
                        {patrolEditMode ? 'Done Editing' : 'Edit Route'}
                      </Button>
                    </div>

                    {patrolEditMode && (
                      <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-2">Click on the map below to add checkpoints, or enter manually:</div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground">Name</label>
                            <Input
                              value={newCheckpointName}
                              onChange={(e) => setNewCheckpointName(e.target.value)}
                              placeholder="e.g., Main Gate"
                              className="mt-1"
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-xs text-muted-foreground">Radius (m)</label>
                            <Input
                              type="number"
                              value={newCheckpointRadius}
                              onChange={(e) => setNewCheckpointRadius(Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Patrol Route Map */}
                    <div className="w-full h-48 rounded-md overflow-hidden border mb-4">
                      <MapContainer
                        center={[site.location.lat || 12.97, site.location.lng || 77.59]}
                        zoom={16}
                        className="w-full h-full"
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {/* Site center marker */}
                        <Marker position={[site.location.lat, site.location.lng]} />
                        {/* Patrol checkpoints */}
                        {patrolCheckpoints.map((cp, i) => (
                          <Circle
                            key={cp.id}
                            center={[cp.latitude, cp.longitude]}
                            radius={cp.radiusMeters}
                            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2 }}
                          />
                        ))}
                        {patrolCheckpoints.map((cp, i) => (
                          <Marker
                            key={`marker-${cp.id}`}
                            position={[cp.latitude, cp.longitude]}
                            icon={L.divIcon({
                              className: 'patrol-checkpoint-marker',
                              html: `<div style="width:24px;height:24px;border-radius:50%;background:#22c55e;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">${cp.order}</div>`,
                              iconSize: [24, 24],
                              iconAnchor: [12, 12],
                            })}
                          />
                        ))}
                        {patrolEditMode && (
                          <PatrolMapClickHandler
                            onAdd={(lat, lng) => {
                              const newCp: PatrolCheckpoint = {
                                id: `pp-${Date.now()}`,
                                name: newCheckpointName || `Checkpoint ${patrolCheckpoints.length + 1}`,
                                latitude: lat,
                                longitude: lng,
                                radiusMeters: newCheckpointRadius,
                                order: patrolCheckpoints.length + 1,
                              };
                              setPatrolCheckpoints([...patrolCheckpoints, newCp]);
                              setNewCheckpointName('');
                            }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    {/* Checkpoint list */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {patrolCheckpoints.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No patrol checkpoints defined. {patrolEditMode ? 'Click on the map to add.' : 'Enable edit mode to add checkpoints.'}
                        </div>
                      )}
                      {patrolCheckpoints.map((cp, idx) => (
                        <div key={cp.id} className="flex items-center gap-2 p-2 bg-muted/10 rounded">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">
                            {cp.order}
                          </div>
                          <div className="flex-1">
                            {patrolEditMode ? (
                              <Input
                                value={cp.name}
                                onChange={(e) => {
                                  const updated = [...patrolCheckpoints];
                                  updated[idx] = { ...cp, name: e.target.value };
                                  setPatrolCheckpoints(updated);
                                }}
                                className="h-7 text-sm"
                              />
                            ) : (
                              <span className="text-sm font-medium">{cp.name}</span>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {cp.latitude.toFixed(5)}, {cp.longitude.toFixed(5)} • {cp.radiusMeters}m radius
                            </div>
                          </div>
                          {patrolEditMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = patrolCheckpoints.filter((_, i) => i !== idx);
                                // Re-order remaining checkpoints
                                updated.forEach((c, i) => c.order = i + 1);
                                setPatrolCheckpoints(updated);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))}
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
                      <Input value={radiusValue} onChange={(e) => setRadiusValue(Number(e.target.value))} type="number" />
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
// Patrol route map click handler
function PatrolMapClickHandler({ onAdd }: { onAdd: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}