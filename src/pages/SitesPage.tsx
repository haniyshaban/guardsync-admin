import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { mockSites, mockGuards } from '@/data/mockData';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin,
  Users,
  Edit,
  Trash2,
  Settings
} from 'lucide-react';

export default function SitesPage() {
  const [sites, setSites] = useState(mockSites);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeSite, setActiveSite] = useState<typeof mockSites[0] | null>(null);
  const [geofenceMode, setGeofenceMode] = useState<'radius' | 'polygon'>('radius');
  const [radiusValue, setRadiusValue] = useState<number>(100);
  const [polygonText, setPolygonText] = useState<string>('');
  const [polygonPoints, setPolygonPoints] = useState<{lat:number;lng:number}[]>([]);

  // Load persisted sites from localStorage on mount (if present)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gw_sites');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const rev = parsed.map((s: any) => ({
            ...s,
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
            geofenceRadius: s.geofenceRadius ? Number(s.geofenceRadius) : 0,
          }));
          setSites(rev);
          // also sync the imported mockSites array for other code that reads it
          try {
            mockSites.length = 0;
            rev.forEach((r: any) => mockSites.push(r));
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (err) {
      // ignore parse errors
    }
  }, []);

  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGuardCount = (siteId: string) => {
    return mockGuards.filter(g => g.siteId === siteId).length;
  };

  const getActiveGuardCount = (siteId: string) => {
    return mockGuards.filter(g => g.siteId === siteId && (g.status === 'online' || g.status === 'idle')).length;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Site Management</h1>
              <p className="text-sm text-muted-foreground">
                {sites.length} sites • {sites.filter(s => s.isActive).length} active
              </p>
            </div>
          </div>

          <Button variant="glow">
            <Plus className="w-4 h-4 mr-2" />
            Add New Site
          </Button>
        </div>

        {/* Configure Geofence Dialog */}
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Geofence</DialogTitle>
              <DialogDescription>Choose geofence type and edit values for {activeSite?.name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Geofence Mode</div>
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
              </div>

              {geofenceMode === 'radius' && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Radius (meters)</div>
                  <Input value={radiusValue} onChange={(e) => setRadiusValue(Number(e.target.value))} type="number" />
                </div>
              )}

              {geofenceMode === 'polygon' && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Draw polygon on map (click to add points)</div>
                  <div className="w-full h-64 rounded-md overflow-hidden border">
                    <MapContainer center={[activeSite?.location.lat || 12.97, activeSite?.location.lng || 77.59]} zoom={13} className="w-full h-full">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Polygon positions={polygonPoints.map(p => [p.lat, p.lng]) as any} pathOptions={{ color: 'blue', fillOpacity: 0.1 }} />
                      {polygonPoints.map((p, i) => (
                        <Marker key={i} position={[p.lat, p.lng]} />
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
            </div>

            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (!activeSite) return;
                  const updated = sites.map(s => {
                    if (s.id !== activeSite.id) return s;
                    const copy: any = { ...s };
                    copy.geofenceType = geofenceMode;
                    if (geofenceMode === 'radius') {
                      copy.geofenceRadius = Number(radiusValue) || copy.geofenceRadius;
                      delete copy.geofencePolygon;
                    } else {
                      // Prefer polygonPoints drawn on the map; fall back to pasted JSON
                      if (polygonPoints && polygonPoints.length > 0) {
                        copy.geofencePolygon = polygonPoints.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }));
                      } else {
                        try {
                          const parsed = JSON.parse(polygonText);
                          if (Array.isArray(parsed)) {
                            copy.geofencePolygon = parsed.map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
                          }
                        } catch (err) {
                          // ignore parse error
                        }
                      }
                    }
                    return copy;
                  });
                  setSites(updated);
                  // Persist changes to the shared in-memory mockSites so other pages see the update
                  try {
                    const updatedSite = updated.find(u => u.id === activeSite.id);
                    if (updatedSite) {
                      const idx = mockSites.findIndex(ms => ms.id === updatedSite.id);
                      if (idx >= 0) {
                        mockSites[idx] = updatedSite;
                      } else {
                        mockSites.push(updatedSite);
                      }
                    }
                  } catch (err) {
                    // ignore
                  }
                  // Save to localStorage so changes persist across reloads
                  try {
                    localStorage.setItem('gw_sites', JSON.stringify(updated));
                  } catch (err) {
                    // ignore
                  }
                  setIsConfigOpen(false);
                }}>Save</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

          {/* Map click handler component */}
        

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site, index) => (
            <Card 
              key={site.id} 
              variant="elevated"
              className="animate-fade-in hover:border-primary/30 transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{site.name}</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        {site.address}
                      </div>
                    </div>
                  </div>
                  <Badge variant={site.isActive ? 'success' : 'secondary'}>
                    {site.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-xs">Guards</span>
                    </div>
                    <p className="text-xl font-bold font-mono mt-1">
                      {getActiveGuardCount(site.id)}/{getGuardCount(site.id)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">Geofence</span>
                    </div>
                    <p className="text-xl font-bold font-mono mt-1">
                      {site.geofenceType === 'polygon' ? 'Polygon' : `${site.geofenceRadius}m`}
                    </p>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="text-xs text-muted-foreground font-mono p-2 rounded bg-muted/30">
                  {site.location.lat.toFixed(4)}°N, {site.location.lng.toFixed(4)}°E
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                    setActiveSite(site);
                    setGeofenceMode(site.geofenceType || 'radius');
                    setRadiusValue(site.geofenceRadius || 100);
                    setPolygonText(site.geofencePolygon ? JSON.stringify(site.geofencePolygon, null, 2) : '');
                    setPolygonPoints(site.geofencePolygon ? site.geofencePolygon.map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) })) : []);
                    setIsConfigOpen(true);
                  }}>
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
