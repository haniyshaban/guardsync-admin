import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { GuardList } from '@/components/dashboard/GuardList';
import { LiveMap } from '@/components/map/LiveMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockGuards, mockSites, calculateDashboardStats } from '@/data/mockData';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Building2, 
  MapPin,
  RefreshCw,
  Download,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const Index = () => {
  const [guards] = useState(mockGuards);
  const [sites] = useState(mockSites);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const stats = calculateDashboardStats(guards, sites);

  const recentAlerts = guards.filter(g => g.status === 'alert').slice(0, 5);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
            <p className="text-muted-foreground mt-1">
              Real-time overview of all security operations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{format(now, 'HH:mm:ss')}</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="glow" size="sm" className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Guards"
            value={stats.totalGuards}
            icon={Users}
            variant="info"
            to="/guards"
          />
          <StatCard
            title="Active Now"
            value={stats.activeGuards}
            icon={UserCheck}
            variant="success"
            trend={{ value: 12, isPositive: true }}
            to="/guards?status=online"
          />
          <StatCard
            title="Offline"
            value={stats.offlineGuards}
            icon={UserX}
            variant="warning"
            to="/guards?status=offline"
          />
          <StatCard
            title="Alerts"
            value={stats.alertGuards}
            icon={AlertTriangle}
            variant="destructive"
            to="/alerts"
          />
          <StatCard
            title="Total Sites"
            value={stats.totalSites}
            icon={Building2}
            to="/sites"
          />
          <StatCard
            title="Active Sites"
            value={stats.activeSites}
            icon={MapPin}
            variant="success"
            to="/sites"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Map - Takes 2 columns */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Live Guard Positions
              </CardTitle>
              <Link to="/live-map">
                <Button variant="ghost" size="sm">
                  Expand Map →
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] rounded-b-lg overflow-hidden">
                <LiveMap 
                  guards={guards} 
                  sites={sites}
                  showGeofences={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Guard List Panel */}
          <Card variant="elevated">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Guard Status
                </CardTitle>
                <Badge variant="secondary" className="font-mono">
                  {guards.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <GuardList 
                guards={guards.slice(0, 20)} 
                maxHeight="340px"
              />
              <Link to="/guards">
                <Button variant="ghost" className="w-full mt-4">
                  View All Guards →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {recentAlerts.length > 0 && (
          <Card variant="elevated" className="border-destructive/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentAlerts.map(guard => (
                  <Link to="/alerts" key={guard.id} className="block">
                    <div 
                      className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors"
                    >
                      <div className="status-dot status-alert" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{guard.name}</p>
                        <p className="text-xs text-muted-foreground">{guard.employeeId}</p>
                      </div>
                      <Badge variant="alert">Missed Check-in</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Clock-in Time</p>
                  <p className="text-2xl font-bold font-mono mt-1">08:42</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Geofence Compliance</p>
                  <p className="text-2xl font-bold font-mono mt-1 text-success">94.2%</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wake-up Response Rate</p>
                  <p className="text-2xl font-bold font-mono mt-1 text-warning">87.5%</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
