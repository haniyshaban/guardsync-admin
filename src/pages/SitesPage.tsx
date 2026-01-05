import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { mockSites, mockGuards } from '@/data/mockData';
import { useState } from 'react';
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
  const [sites] = useState(mockSites);
  const [searchQuery, setSearchQuery] = useState('');

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
                      {site.geofenceRadius}m
                    </p>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="text-xs text-muted-foreground font-mono p-2 rounded bg-muted/30">
                  {site.location.lat.toFixed(4)}°N, {site.location.lng.toFixed(4)}°E
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
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
