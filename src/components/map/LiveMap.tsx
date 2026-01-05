import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Guard, Site } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom guard marker icons based on status
const createGuardIcon = (status: Guard['status']) => {
  const colors = {
    online: '#22c55e',
    offline: '#ef4444',
    idle: '#f59e0b',
    alert: '#dc2626',
  };

  const color = colors[status];
  const pulseClass = status === 'alert' ? 'animate-ping-slow' : '';

  return L.divIcon({
    className: 'custom-guard-marker',
    html: `
      <div class="relative">
        <div class="absolute -inset-2 rounded-full ${pulseClass}" style="background: ${color}40;"></div>
        <div class="relative w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background: ${color};"></div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Site marker icon
const createSiteIcon = () => {
  return L.divIcon({
    className: 'custom-site-marker',
    html: `
      <div class="relative">
        <div class="w-8 h-8 rounded-lg bg-primary/80 border-2 border-primary flex items-center justify-center shadow-lg" style="background: hsl(192, 95%, 50%); border-color: hsl(192, 95%, 60%);">
          <svg class="w-4 h-4" fill="white" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface MapBoundsUpdaterProps {
  guards: Guard[];
  sites: Site[];
}

function MapBoundsUpdater({ guards, sites }: MapBoundsUpdaterProps) {
  const map = useMap();
  const hasSetBounds = useRef(false);

  useEffect(() => {
    if (hasSetBounds.current) return;
    
    const allPoints: [number, number][] = [];
    
    guards.forEach(guard => {
      if (guard.location) {
        allPoints.push([guard.location.lat, guard.location.lng]);
      }
    });
    
    sites.forEach(site => {
      allPoints.push([site.location.lat, site.location.lng]);
      // include polygon points in bounds if present
      if ((site as any).geofenceType === 'polygon' && Array.isArray((site as any).geofencePolygon)) {
        ((site as any).geofencePolygon as Array<any>).forEach((p: any) => {
          if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
            allPoints.push([p.lat, p.lng]);
          }
        });
      }
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
      hasSetBounds.current = true;
    }
  }, [map, guards, sites]);

  return null;
}

interface LiveMapProps {
  guards: Guard[];
  sites: Site[];
  showSites?: boolean;
  showGeofences?: boolean;
  selectedGuardId?: string | null;
  onGuardClick?: (guard: Guard) => void;
  onSiteClick?: (site: Site) => void;
}

export function LiveMap({
  guards,
  sites,
  showSites = true,
  showGeofences = true,
  selectedGuardId,
  onGuardClick,
  onSiteClick,
}: LiveMapProps) {
  // Default center on Delhi NCR region
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const defaultZoom = 10;

  const getStatusVariant = (status: Guard['status']): "online" | "offline" | "idle" | "alert" | "secondary" => {
    switch (status) {
      case 'online': return 'online';
      case 'offline': return 'offline';
      case 'idle': return 'idle';
      case 'alert': return 'alert';
      default: return 'secondary';
    }
  };

  // Point-in-polygon (ray-casting) helper
  const pointInPolygon = (point: [number, number], vs: Array<[number, number]>): boolean => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + Number.EPSILON) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const isPointInsideSiteGeofence = (lat: number, lng: number, site: Site) => {
    const pt: [number, number] = [lat, lng];
    if ((site as any).geofenceType === 'polygon' && Array.isArray((site as any).geofencePolygon) && (site as any).geofencePolygon.length > 0) {
      const vs = (site as any).geofencePolygon.map((p: any) => [p.lat, p.lng] as [number, number]);
      return pointInPolygon(pt, vs);
    }
    // fallback to circle
    const dist = L.latLng(lat, lng).distanceTo(L.latLng(site.location.lat, site.location.lng));
    return dist <= (site.geofenceRadius || 0);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsUpdater guards={guards} sites={sites} />

        {/* Render site geofences (radius or polygon) */}
        {showGeofences && sites.map(site => (
          site.isActive && (
            ((site as any).geofenceType === 'polygon' && Array.isArray((site as any).geofencePolygon) && (site as any).geofencePolygon.length > 0)
            ? (
              <Polygon
                key={`geofence-poly-${site.id}`}
                positions={((site as any).geofencePolygon as Array<any>).map((p: any) => [p.lat, p.lng]) as any}
                pathOptions={{
                  color: 'hsl(192, 95%, 50%)',
                  fillColor: 'hsl(192, 95%, 50%)',
                  fillOpacity: 0.08,
                  weight: 2,
                }}
              />
            ) : (
              <Circle
                key={`geofence-${site.id}`}
                center={[site.location.lat, site.location.lng]}
                radius={site.geofenceRadius}
                pathOptions={{
                  color: 'hsl(192, 95%, 50%)',
                  fillColor: 'hsl(192, 95%, 50%)',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              />
            )
          )
        ))}

        {/* Render site markers */}
        {showSites && sites.map(site => (
          <Marker
            key={site.id}
            position={[site.location.lat, site.location.lng]}
            icon={createSiteIcon()}
            eventHandlers={{
              click: () => onSiteClick?.(site),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-foreground">{site.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{site.address}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={site.isActive ? 'success' : 'secondary'}>
                    {site.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {site.assignedGuards.length} guards
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  { (site as any).geofenceType === 'polygon' && Array.isArray((site as any).geofencePolygon)
                    ? `Geofence: custom polygon (${(site as any).geofencePolygon.length} points)`
                    : `Geofence: ${site.geofenceRadius}m radius`
                  }
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render guard markers */}
        {guards.map(guard => (
          guard.location && (
            (() => {
              // Determine if guard is inside any site's geofence
              const insideAny = sites.some(site => isPointInsideSiteGeofence(guard.location!.lat, guard.location!.lng, site));
              const effectiveStatus: Guard['status'] = guard.status === 'alert' ? 'alert' : (insideAny ? 'online' : guard.status);
              
              return (
                <Marker
                  key={guard.id}
                  position={[guard.location.lat, guard.location.lng]}
                  icon={createGuardIcon(effectiveStatus)}
                  eventHandlers={{
                    click: () => onGuardClick?.(guard),
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className={`status-dot status-${guard.status}`} />
                        <h3 className="font-semibold text-foreground">{guard.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {guard.employeeId}
                      </p>
                      <div className="mt-2">
                        <Badge variant={getStatusVariant(guard.status)}>
                          {guard.status.charAt(0).toUpperCase() + guard.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Last seen: {formatDistanceToNow(guard.lastSeen, { addSuffix: true })}
                      </p>
                      {guard.clockedIn && guard.clockInTime && (
                        <p className="text-xs text-muted-foreground">
                          Clocked in: {formatDistanceToNow(guard.clockInTime, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })()
          )
        ))}
        </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg border border-border p-3">
        <h4 className="text-xs font-semibold text-foreground mb-2">Status Legend</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="status-dot status-online" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot status-idle" />
            <span className="text-xs text-muted-foreground">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot status-offline" />
            <span className="text-xs text-muted-foreground">Offline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot status-alert" />
            <span className="text-xs text-muted-foreground">Alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
