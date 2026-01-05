import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LiveMap } from '@/components/map/LiveMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { mockGuards, mockSites } from '@/data/mockData';
import { useState } from 'react';
import { 
  Map, 
  Layers, 
  Users, 
  Building2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { Guard, Site } from '@/types';

export default function LiveMapPage() {
  const [guards] = useState(mockGuards);
  const [sites] = useState(mockSites);
  const [showSites, setShowSites] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const onlineGuards = guards.filter(g => g.status === 'online').length;
  const idleGuards = guards.filter(g => g.status === 'idle').length;
  const alertGuards = guards.filter(g => g.status === 'alert').length;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-0px)] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Live Map</h1>
              <p className="text-sm text-muted-foreground">
                Real-time guard positions across all sites
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="status-dot status-online" />
                <span className="text-sm font-mono">{onlineGuards}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="status-dot status-idle" />
                <span className="text-sm font-mono">{idleGuards}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="status-dot status-alert" />
                <span className="text-sm font-mono">{alertGuards}</span>
              </div>
            </div>

            {/* Layer Controls */}
            <div className="flex items-center gap-4 border-l border-border pl-4">
              <div className="flex items-center gap-2">
                <Switch 
                  id="show-sites" 
                  checked={showSites}
                  onCheckedChange={setShowSites}
                />
                <Label htmlFor="show-sites" className="text-sm">Sites</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  id="show-geofences" 
                  checked={showGeofences}
                  onCheckedChange={setShowGeofences}
                />
                <Label htmlFor="show-geofences" className="text-sm">Geofences</Label>
              </div>
            </div>

            <Button variant="outline" size="icon">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Map Content */}
        <div className="flex-1 flex">
          {/* Main Map */}
          <div className="flex-1 p-4">
            <div className="h-full rounded-lg overflow-hidden">
              <LiveMap
                guards={guards}
                sites={sites}
                showSites={showSites}
                showGeofences={showGeofences}
                selectedGuardId={selectedGuard?.id}
                onGuardClick={setSelectedGuard}
                onSiteClick={setSelectedSite}
              />
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="w-80 border-l border-border p-4 space-y-4 overflow-y-auto">
            {/* Sites Overview */}
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Sites Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sites.map(site => (
                  <div 
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedSite?.id === site.id 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-card/50 border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{site.name}</p>
                      <Badge variant={site.isActive ? 'success' : 'secondary'} className="text-xs">
                        {site.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{site.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {site.assignedGuards.length} guards assigned
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Selected Guard/Site Details */}
            {selectedGuard && (
              <Card variant="glow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Selected Guard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                      {selectedGuard.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{selectedGuard.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedGuard.employeeId}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={selectedGuard.status as any}>{selectedGuard.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-mono text-xs">{selectedGuard.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clocked In</span>
                      <span>{selectedGuard.clockedIn ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    View Full Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            {selectedSite && !selectedGuard && (
              <Card variant="glow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Selected Site
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{selectedSite.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedSite.address}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={selectedSite.isActive ? 'success' : 'secondary'}>
                        {selectedSite.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Geofence</span>
                      <span className="font-mono">{selectedSite.geofenceRadius}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guards</span>
                      <span>{selectedSite.assignedGuards.length}</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    Manage Site
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
