import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockGuards, mockAttendanceLogs, mockSites } from '@/data/mockData';
import { toast as sonnerToast } from '@/components/ui/sonner';
import { 
  Bell, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export default function AlertsPage() {
  const missed = mockGuards.filter(g => {
    if (!g.siteId) return false;
    const site = mockSites.find(s => s.id === g.siteId);
    if (!site || !site.isActive) return false;
    const attendance = mockAttendanceLogs.find(l => l.guardId === g.id);
    const hasClockedIn = (attendance && attendance.clockIn) ?
      (new Date(attendance.clockIn).toDateString() === new Date().toDateString()) :
      (g.clockInTime ? new Date(g.clockInTime).toDateString() === new Date().toDateString() : false);
    return !hasClockedIn;
  });

  const alertMap = new Map<string, { guard: typeof mockGuards[number]; reason: 'status' | 'missed' }>();
  mockGuards.filter(g => g.status === 'alert').forEach(g => alertMap.set(g.id, { guard: g, reason: 'status' }));
  missed.forEach(g => { if (!alertMap.has(g.id)) alertMap.set(g.id, { guard: g, reason: 'missed' }); });
  const alertGuards = Array.from(alertMap.values()).map(v => v.guard);

  // Precompute attendance/isMissed to simplify JSX mapping (avoids complex inline blocks)
  const alertsToRender = alertGuards.map(g => {
    const attendance = mockAttendanceLogs.find(l => l.guardId === g.id);
    const isMissed = attendance ? (new Date(attendance.clockIn).toDateString() !== new Date().toDateString()) : (!g.clockInTime || new Date(g.clockInTime).toDateString() !== new Date().toDateString());
    return { guard: g, isMissed };
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Active Alerts</h1>
              <p className="text-sm text-muted-foreground">
                {alertGuards.length} guards require attention
              </p>
            </div>
          </div>

          <Button variant="outline">
            Mark All Resolved
          </Button>
        </div>

        <div className="space-y-4">
          {alertsToRender.map(({ guard, isMissed }, index) => (
            <Card 
              key={guard.id}
              variant="elevated"
              className="border-destructive/30 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 status-dot status-alert border-2 border-background" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{guard.name}</p>
                        <Badge variant="alert">{isMissed ? 'Missed Check-in' : 'Alert'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{guard.employeeId}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Last seen {formatDistanceToNow(guard.lastSeen, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Contact
                    </Button>
                    <Link to={`/guards/${guard.id}`}>
                      <Button variant="ghost" size="sm">View Guard Details</Button>
                    </Link>
                    <Button variant="success" size="sm" onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const res = await fetch(`http://localhost:4000/api/guards/${guard.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...guard, status: 'idle', lastSeen: new Date().toISOString() }),
                        });
                        if (!res.ok) throw new Error('Failed to update guard');
                        const updated = await res.json();
                        // merge into local mockGuards
                        const idx = mockGuards.findIndex(g => g.id === updated.id);
                        if (idx >= 0) mockGuards[idx] = { ...mockGuards[idx], ...updated };
                        try { window.dispatchEvent(new CustomEvent('guards-updated')); } catch (e) {}
                        sonnerToast.success('Alert resolved');
                      } catch (err) {
                        console.error('Resolve failed', err);
                        sonnerToast.error('Failed to resolve alert');
                      }
                    }}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {alertGuards.length === 0 && (
            <Card variant="elevated">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Clear</h3>
                <p className="text-muted-foreground">
                  No active alerts. All guards are responding normally.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
