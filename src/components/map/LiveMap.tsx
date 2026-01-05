import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Guard, Site } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
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
  focusSiteId?: string | null;
}

function MapBoundsUpdater({ guards, sites, focusSiteId }: MapBoundsUpdaterProps) {
  const map = useMap();
  const hasSetBounds = useRef(false);

  useEffect(() => {
    // If a specific site focus is requested, skip auto-fitting to all points
    if (focusSiteId) {
      console.log('[MapBoundsUpdater] skipping auto-fit because focusSiteId=', focusSiteId);
      return;
    }
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
  }, [map, guards, sites, focusSiteId]);

  return null;
}

// Focus handler: recenters/zooms map to a specific site's geofence when requested
function MapFocusHandler({ sites, focusSiteId }: { sites: Site[]; focusSiteId?: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!focusSiteId) return;
    const site = sites.find(s => s.id === focusSiteId);
    if (!site) return;

    // cancellation tokens and timeout trackers live in the effect scope
    let cancelled = false;
    const timeouts: number[] = [];

    try {
      map.invalidateSize();
      map.whenReady(() => {
        try {
          // Polygon geofence -> flyToBounds with animation and padding
          if ((site as any).geofenceType === 'polygon' && Array.isArray((site as any).geofencePolygon) && (site as any).geofencePolygon.length > 0) {
            const pts = ((site as any).geofencePolygon as Array<any>).map((p: any) => [p.lat, p.lng]);
            const bounds = L.latLngBounds(pts as any);
            if (bounds) {
              try {
                const size = map.getSize();
                const padX = Math.round((size?.x || 800) * 0.12);
                const padY = Math.round((size?.y || 600) * 0.12);
                const MAX_FOCUS_ZOOM = 16; // avoid over-zooming into blank tiles
                if ((map as any).flyToBounds) {
                  (map as any).flyToBounds(bounds, { padding: [padX, padY], duration: 0.9, maxZoom: MAX_FOCUS_ZOOM });
                } else {
                  map.fitBounds(bounds, { padding: [padX, padY], maxZoom: MAX_FOCUS_ZOOM });
                }
              } catch (e) {
                map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
              }
            }
            return;
          }

          // Radius geofence -> compute zoom so radius occupies ~60% of map width and animate
          const radius = Number((site as any).geofenceRadius) || 0;
          if (radius > 0) {
            const lat = site.location.lat;
                <div className="absolute top-3 right-3 z-[9999]">
                  <button
                    onClick={() => {
                      const idx = availableThemes.indexOf(mapTheme);
                      const next = availableThemes[(idx + 1) % availableThemes.length];
                      setMapTheme(next);
                    }}
                    aria-label="Toggle map theme"
                    title={mapTheme === 'streets-dark' ? 'Streets Dark' : mapTheme === 'carto-dark' ? 'Dark' : 'Light'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 8,
                      boxShadow: mapTheme === 'carto-light' ? '0 6px 18px rgba(15, 23, 42, 0.12)' : '0 4px 8px rgba(0,0,0,0.45)',
                      border: mapTheme === 'carto-light' ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.06)',
                      background: mapTheme === 'carto-light' ? '#ffffff' : 'rgba(0,0,0,0.6)',
                      color: mapTheme === 'carto-light' ? '#0f172a' : '#ffffff',
                      zIndex: 9999,
                      cursor: 'pointer'
                    }}
                  >
                    {mapTheme === 'carto-light' && <Sun className="h-4 w-4" />}
                    {mapTheme === 'carto-dark' && <Moon className="h-4 w-4" />}
                    {mapTheme === 'streets-dark' && <Moon className="h-4 w-4 text-amber-300" />}
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{mapTheme === 'carto-light' ? 'Light' : mapTheme === 'carto-dark' ? 'Dark' : 'Streets'}</span>
                  </button>
                </div>
            zoom = Math.min(Math.max(zoom, 3), MAX_FOCUS_ZOOM_LOCAL);

            // Retry logic using moveend: wait for the map to finish moving before retrying.
            let attempts = 0;
            const maxAttempts = 4;
            const attemptFocus = () => {
              if (cancelled) return;
              attempts += 1;
              try { map.flyTo([lat, lng], zoom, { animate: true, duration: 0.9 }); } catch (e) {}

              const onMoveEnd = () => {
                try {
                  if (cancelled) {
                    map.off('moveend', onMoveEnd);
                    return;
                  }
                  const center = map.getCenter();
                  const dist = center ? center.distanceTo(L.latLng(lat, lng)) : Infinity;
                  if (!cancelled && dist > Math.max(30, radius * 0.6) && attempts < maxAttempts) {
                    // schedule a gentle retry after a short pause to allow tiles/rendering
                    const t = window.setTimeout(() => {
                      if (!cancelled) attemptFocus();
                    }, 300);
                    timeouts.push(t);
                  }
                } finally {
                  map.off('moveend', onMoveEnd);
                }
              };

              map.on('moveend', onMoveEnd);
            };

            // start first attempt
            attemptFocus();

            return;
          }

          // Fallback: simple setView
          map.setView([site.location.lat, site.location.lng], 16);
        } catch (err) {
          // ignore
        }
      });
    } catch (err) {
      // ignore
    }

    // effect cleanup: cancel any pending retries when focusSiteId or map changes
    return () => {
      cancelled = true;
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [map, focusSiteId, sites]);

  return null;
}

interface LiveMapProps {
  guards: Guard[];
  sites: Site[];
  showSites?: boolean;
  showGeofences?: boolean;
  showGuards?: boolean;
  selectedGuardId?: string | null;
  onGuardClick?: (guard: Guard) => void;
  onSiteClick?: (site: Site) => void;
  focusSiteId?: string;
}

export function LiveMap({
  guards,
  sites,
  showSites = true,
  showGeofences = true,
  showGuards = true,
  selectedGuardId,
  onGuardClick,
  onSiteClick,
  focusSiteId,
}: LiveMapProps) {
  // Default center on Delhi NCR region
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const defaultZoom = 10;

  // Helper to compute zoom for radius geofences (meters) using map width and latitude
  const computeZoomForRadius = (r: number, lat: number, mapWidthPx: number) => {
    const desiredFraction = 0.6; // target diameter will occupy 60% of the map width
    const metersPerPixel = (r * 2) / (mapWidthPx * desiredFraction);
    const equatorMPerPx = 156543.03392804097; // meters per pixel at zoom 0 at equator
    const metersPerPixelAtZoom0 = equatorMPerPx * Math.cos(lat * Math.PI / 180);
    let zoom = Math.floor(Math.log2(metersPerPixelAtZoom0 / metersPerPixel));
    if (!isFinite(zoom) || Number.isNaN(zoom)) zoom = 15;
    // clamp to avoid over-zooming
    const MAX_FOCUS_ZOOM = 16;
    zoom = Math.min(Math.max(zoom, 3), MAX_FOCUS_ZOOM);
    return zoom;
  };

  // Compute a reasonable marker position for a site.
  // For polygon geofences, return the polygon centroid (area-weighted) as the marker position.
  // Fallback to the configured `site.location` when polygon data is missing or degenerate.
  const getSiteMarkerPosition = (site: Site): [number, number] => {
    try {
      if ((site as any).geofenceType === 'polygon' && Array.isArray((site as any).geofencePolygon) && (site as any).geofencePolygon.length > 0) {
        const pts = (site as any).geofencePolygon as Array<any>;
        const n = pts.length;
        if (n === 0) return [site.location.lat, site.location.lng];

        // Use area-weighted centroid formula for polygons
        let area = 0;
        let cx = 0;
        let cy = 0;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const xi = pts[i].lng;
          const yi = pts[i].lat;
          const xj = pts[j].lng;
          const yj = pts[j].lat;
          const a = xi * yj - xj * yi;
          area += a;
          cx += (xi + xj) * a;
          cy += (yi + yj) * a;
        }
        area = area / 2;
        if (area === 0) {
          // degenerate polygon: fall back to average of points
          const avgLat = pts.reduce((s, p) => s + Number(p.lat || 0), 0) / n;
          const avgLng = pts.reduce((s, p) => s + Number(p.lng || 0), 0) / n;
          return [avgLat, avgLng];
        }
        const centroidLng = cx / (6 * area);
        const centroidLat = cy / (6 * area);
        return [centroidLat, centroidLng];
      }
    } catch (e) {
      // ignore and fallback
    }
    return [site.location.lat, site.location.lng];
  };

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

  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('gw_map_theme') === 'dark') ? 'dark' : 'light'; } catch { return 'light'; }
  });

  const tileUrl = mapTheme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  useEffect(() => {
    try { localStorage.setItem('gw_map_theme', mapTheme); } catch {}
  }, [mapTheme]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      <div className="absolute top-3 right-3 z-30">
        <Button
          variant="outline"
          className="h-9 w-9 p-0"
          onClick={() => setMapTheme(t => t === 'light' ? 'dark' : 'light')}
          aria-label="Toggle map theme"
        >
          {mapTheme === 'light'
            ? <Moon className="h-4 w-4 text-slate-900" />
            : <Sun className="h-4 w-4 text-white" />}
        </Button>
      </div>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        {/*
          Using a minimalist raster basemap (CartoDB Positron) reduces visual clutter.
          Note: to fully hide specific POI types (e.g. hospitals/temples) while keeping others
          (e.g. bus stops), you need vector tiles with a styled renderer (Mapbox/MapTiler + MapLibre/Mapbox GL).
          That approach requires an API key and switching to a vector renderer. This raster layer is a quick, no-key improvement.
        */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &amp; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />
        
        <MapBoundsUpdater guards={guards} sites={sites} focusSiteId={focusSiteId ?? null} />
        <MapFocusHandler sites={sites} focusSiteId={focusSiteId ?? null} />

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
            position={getSiteMarkerPosition(site)}
            icon={createSiteIcon()}
            eventHandlers={{
              click: () => onSiteClick?.(site),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-foreground" style={{ color: '#0f172a' }}>{site.name}</h3>
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

        {/* Render guard markers if enabled */}
        {showGuards && guards.map((guard) => {
          if (!guard.location) return null;
          const insideAny = sites.some(site => isPointInsideSiteGeofence(guard.location!.lat, guard.location!.lng, site));
          const effectiveStatus: Guard['status'] = guard.status === 'alert' ? 'alert' : (insideAny ? 'online' : guard.status);
          return (
            <Marker
              key={guard.id}
              position={[guard.location.lat, guard.location.lng]}
              icon={createGuardIcon(effectiveStatus)}
              eventHandlers={{ click: () => onGuardClick?.(guard) }}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <div className={`status-dot status-${guard.status}`} />
                    <h3 className="font-semibold text-foreground" style={{ color: '#0f172a' }}>{guard.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">ID: {guard.employeeId}</p>
                  <div className="mt-2">
                    <Badge variant={getStatusVariant(guard.status)}>
                      {guard.status.charAt(0).toUpperCase() + guard.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Last seen: {formatDistanceToNow(guard.lastSeen, { addSuffix: true })}</p>
                  {guard.clockedIn && guard.clockInTime && (
                    <p className="text-xs text-muted-foreground">Clocked in: {formatDistanceToNow(guard.clockInTime, { addSuffix: true })}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
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
