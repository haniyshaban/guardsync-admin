import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockAttendanceLogs, mockGuards, mockSites } from '@/data/mockData';
import { FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [fromDateObj, setFromDateObj] = useState<Date>(new Date(fromDate));
  const [toDateObj, setToDateObj] = useState<Date>(new Date(toDate));
  const [siteId, setSiteId] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('attendance');

  const guardsById = useMemo(() => Object.fromEntries(mockGuards.map(g => [g.id, g])), []);

  const filtered = useMemo(() => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23,59,59,999);

    return mockAttendanceLogs.filter(l => {
      const time = new Date(l.clockIn || l.clockOut || l.createdAt || l.clockIn);
      if (isNaN(time.getTime())) return false;
      if (time < from || time > to) return false;
      if (siteId !== 'all' && l.siteId !== siteId) return false;
      return true;
    }).map(l => ({
      ...l,
      guard: guardsById[l.guardId]
    }));
  }, [fromDate, toDate, siteId, guardsById]);

  function downloadCSV() {
    const rows = filtered.map(r => ({
      id: r.id,
      guardId: r.guardId,
      guardName: r.guard?.name || '',
      siteId: r.siteId,
      clockIn: r.clockIn ? new Date(r.clockIn).toISOString() : '',
      withinGeofence: String(r.withinGeofence),
    }));

    const header = Object.keys(rows[0] || {}).join(',') + '\n';
    const csv = header + rows.map(row => Object.values(row).map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPrintable() {
    const html = `
      <html><head><title>Report</title></head><body>
        <h2>Report: ${reportType}</h2>
        <p>From: ${fromDate} To: ${toDate}</p>
        <table border="1" cellpadding="6" cellspacing="0">
          <thead><tr><th>ID</th><th>Guard</th><th>Site</th><th>ClockIn</th><th>WithinGeofence</th></tr></thead>
          <tbody>
            ${filtered.map(r => `<tr><td>${r.id}</td><td>${r.guard?.name || ''}</td><td>${r.siteId}</td><td>${r.clockIn ? new Date(r.clockIn).toLocaleString() : ''}</td><td>${r.withinGeofence}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Generate and export attendance and activity reports.</p>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Input readOnly value={fromDate} className="mt-2 cursor-pointer" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDateObj}
                      onSelect={(d) => {
                        if (d) {
                          const dd = Array.isArray(d) ? d[0] : d as Date;
                          setFromDate(format(dd, 'yyyy-MM-dd'));
                          setFromDateObj(dd);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Input readOnly value={toDate} className="mt-2 cursor-pointer" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDateObj}
                      onSelect={(d) => {
                        if (d) {
                          const dd = Array.isArray(d) ? d[0] : d as Date;
                          setToDate(format(dd, 'yyyy-MM-dd'));
                          setToDateObj(dd);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Site</label>
                <Select onValueChange={(v) => setSiteId(v)} defaultValue="all">
                  <SelectTrigger className="w-full mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sites</SelectItem>
                    {mockSites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Report Type</label>
                <Select onValueChange={(v) => setReportType(v)} defaultValue="attendance">
                  <SelectTrigger className="w-full mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="activity">Guard Activity</SelectItem>
                    <SelectItem value="geofence">Geofence Breaches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-4">
              <Button onClick={downloadCSV} className="w-full md:w-auto">Export CSV</Button>
              <Button variant="outline" onClick={openPrintable} className="w-full md:w-auto">Export PDF (Print)</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview ({filtered.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="p-2">ID</th>
                    <th className="p-2">Guard</th>
                    <th className="p-2">Site</th>
                    <th className="p-2">Clock In</th>
                    <th className="p-2">Within Geofence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 text-sm">{r.id}</td>
                      <td className="p-2 text-sm">{r.guard?.name || r.guardId}</td>
                      <td className="p-2 text-sm">{r.siteId}</td>
                      <td className="p-2 text-sm">{r.clockIn ? format(new Date(r.clockIn), 'PPpp') : '—'}</td>
                      <td className="p-2 text-sm">{String(r.withinGeofence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
