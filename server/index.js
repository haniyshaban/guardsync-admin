import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(process.cwd(), 'server', 'data', 'gw.db');
const INITIAL_JSON = path.join(process.cwd(), 'server', 'initialData.json');

// ensure data directory
fs.mkdirSync(path.join(process.cwd(), 'server', 'data'), { recursive: true });

const db = new Database(DB_PATH);

// Initialize tables
db.prepare(`CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  geofenceRadius INTEGER,
  geofenceType TEXT,
  geofencePolygon TEXT,
  assignedGuards TEXT,
  isActive INTEGER,
  createdAt TEXT
)`).run();

// Guards table
db.prepare(`CREATE TABLE IF NOT EXISTS guards (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  employeeId TEXT,
  siteId TEXT,
  status TEXT,
  lastSeen TEXT,
  lat REAL,
  lng REAL,
  locationHistory TEXT,
  clockedIn INTEGER,
  clockInTime TEXT,
  currentShiftId TEXT
)`).run();

// Seed from initialData.json if empty
const rowCount = db.prepare('SELECT COUNT(*) as c FROM sites').get().c;
if (rowCount === 0) {
  try {
    const raw = fs.readFileSync(INITIAL_JSON, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sites)) {
      const insert = db.prepare(`INSERT INTO sites (id,name,address,lat,lng,geofenceRadius,geofenceType,geofencePolygon,assignedGuards,isActive,createdAt)
        VALUES (@id,@name,@address,@lat,@lng,@geofenceRadius,@geofenceType,@geofencePolygon,@assignedGuards,@isActive,@createdAt)`);
      const insertMany = db.transaction((sites) => {
        for (const s of sites) {
          insert.run({
            id: s.id,
            name: s.name,
            address: s.address,
            lat: s.location.lat,
            lng: s.location.lng,
            geofenceRadius: s.geofenceRadius || 0,
            geofenceType: s.geofenceType || 'radius',
            geofencePolygon: s.geofencePolygon ? JSON.stringify(s.geofencePolygon) : null,
            assignedGuards: s.assignedGuards ? JSON.stringify(s.assignedGuards) : '[]',
            isActive: s.isActive ? 1 : 0,
            createdAt: s.createdAt || new Date().toISOString(),
          });
        }
      });
      insertMany(parsed.sites);
      console.log('Seeded sites into sqlite DB');
    }
  } catch (err) {
    console.error('Failed to seed DB:', err);
  }
}

// Helpers
const siteRowToObj = (row) => ({
  id: row.id,
  name: row.name,
  address: row.address,
  location: { lat: row.lat, lng: row.lng },
  geofenceRadius: Number(row.geofenceRadius),
  geofenceType: row.geofenceType,
  geofencePolygon: row.geofencePolygon ? JSON.parse(row.geofencePolygon) : undefined,
  assignedGuards: row.assignedGuards ? JSON.parse(row.assignedGuards) : [],
  isActive: !!row.isActive,
  createdAt: row.createdAt,
});

// Routes
app.get('/api/sites', (req, res) => {
  const rows = db.prepare('SELECT * FROM sites ORDER BY createdAt DESC').all();
  res.json(rows.map(siteRowToObj));
});

app.get('/api/sites/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(siteRowToObj(row));
});

app.post('/api/sites', (req, res) => {
  const s = req.body;
  const insert = db.prepare('INSERT INTO sites (id,name,address,lat,lng,geofenceRadius,geofenceType,geofencePolygon,assignedGuards,isActive,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  try {
    insert.run(
      s.id,
      s.name,
      s.address,
      s.location.lat,
      s.location.lng,
      s.geofenceRadius || 0,
      s.geofenceType || 'radius',
      s.geofencePolygon ? JSON.stringify(s.geofencePolygon) : null,
      s.assignedGuards ? JSON.stringify(s.assignedGuards) : '[]',
      s.isActive ? 1 : 0,
      s.createdAt || new Date().toISOString(),
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/sites/:id', (req, res) => {
  const s = req.body;
  const update = db.prepare('UPDATE sites SET name=@name,address=@address,lat=@lat,lng=@lng,geofenceRadius=@geofenceRadius,geofenceType=@geofenceType,geofencePolygon=@geofencePolygon,assignedGuards=@assignedGuards,isActive=@isActive WHERE id=@id');
  try {
    update.run({
      id: req.params.id,
      name: s.name,
      address: s.address,
      lat: s.location.lat,
      lng: s.location.lng,
      geofenceRadius: s.geofenceRadius || 0,
      geofenceType: s.geofenceType || 'radius',
      geofencePolygon: s.geofencePolygon ? JSON.stringify(s.geofencePolygon) : null,
      assignedGuards: s.assignedGuards ? JSON.stringify(s.assignedGuards) : '[]',
      isActive: s.isActive ? 1 : 0,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/sites/:id', (req, res) => {
  const del = db.prepare('DELETE FROM sites WHERE id = ?');
  try {
    del.run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// helper to map guard row to object
const guardRowToObj = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  employeeId: row.employeeId,
  siteId: row.siteId || null,
  status: row.status || 'offline',
  lastSeen: row.lastSeen,
  location: (row.lat !== null && row.lng !== null) ? { lat: Number(row.lat), lng: Number(row.lng) } : undefined,
  locationHistory: row.locationHistory ? JSON.parse(row.locationHistory) : [],
  clockedIn: !!row.clockedIn,
  clockInTime: row.clockInTime,
  currentShiftId: row.currentShiftId || undefined,
});

// Seed guards table with demo guards if empty
const guardCount = db.prepare('SELECT COUNT(*) as c FROM guards').get().c;
if (guardCount === 0) {
  try {
    const now = new Date().toISOString();
    const demoGuards = [
      { id: 'guard-1', name: 'Rajesh Kumar', phone: '+91 7000000001', employeeId: 'EMP1001', siteId: 'site-1', status: 'online', lastSeen: now, lat: 12.9702, lng: 77.7494, locationHistory: JSON.stringify([{ lat: 12.9702, lng: 77.7494, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-2', name: 'Amit Singh', phone: '+91 7000000002', employeeId: 'EMP1002', siteId: 'site-1', status: 'online', lastSeen: now, lat: 12.9696, lng: 77.7489, locationHistory: JSON.stringify([{ lat: 12.9696, lng: 77.7489, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-3', name: 'Suresh Sharma', phone: '+91 7000000003', employeeId: 'EMP1003', siteId: 'site-1', status: 'online', lastSeen: now, lat: 12.9700, lng: 77.7490, locationHistory: JSON.stringify([{ lat: 12.97, lng: 77.7490, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-4', name: 'Vikram Verma', phone: '+91 7000000004', employeeId: 'EMP1004', siteId: 'site-1', status: 'online', lastSeen: now, lat: 12.9699, lng: 77.7493, locationHistory: JSON.stringify([{ lat: 12.9699, lng: 77.7493, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-5', name: 'Anil Gupta', phone: '+91 7000000005', employeeId: 'EMP1005', siteId: 'site-2', status: 'online', lastSeen: now, lat: 12.9352, lng: 77.6192, locationHistory: JSON.stringify([{ lat: 12.9352, lng: 77.6192, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-6', name: 'Deepak Patel', phone: '+91 7000000006', employeeId: 'EMP1006', siteId: 'site-2', status: 'online', lastSeen: now, lat: 12.9348, lng: 77.6187, locationHistory: JSON.stringify([{ lat: 12.9348, lng: 77.6187, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-7', name: 'Manish Kapoor', phone: '+91 7000000007', employeeId: 'EMP1007', siteId: 'site-2', status: 'alert', lastSeen: now, lat: 12.9351, lng: 77.6194, locationHistory: JSON.stringify([{ lat: 12.9351, lng: 77.6194, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-8', name: 'Sanjay Reddy', phone: '+91 7000000008', employeeId: 'EMP1008', siteId: 'site-3', status: 'idle', lastSeen: now, lat: 12.9761, lng: 77.6052, locationHistory: JSON.stringify([{ lat: 12.9761, lng: 77.6052, at: now }]), clockedIn: 1, clockInTime: now },
      { id: 'guard-9', name: 'Ravi Nair', phone: '+91 7000000009', employeeId: 'EMP1009', siteId: 'site-3', status: 'offline', lastSeen: now, lat: 12.9756, lng: 77.6048, locationHistory: JSON.stringify([{ lat: 12.9756, lng: 77.6048, at: now }]), clockedIn: 0, clockInTime: null },
      { id: 'guard-10', name: 'Prakash Mehta', phone: '+91 7000000010', employeeId: 'EMP1010', siteId: 'site-3', status: 'idle', lastSeen: now, lat: 12.9758, lng: 77.6051, locationHistory: JSON.stringify([{ lat: 12.9758, lng: 77.6051, at: now }]), clockedIn: 1, clockInTime: now },
    ];
    const insertG = db.prepare('INSERT INTO guards (id,name,phone,employeeId,siteId,status,lastSeen,lat,lng,locationHistory,clockedIn,clockInTime,currentShiftId) VALUES (@id,@name,@phone,@employeeId,@siteId,@status,@lastSeen,@lat,@lng,@locationHistory,@clockedIn,@clockInTime,@currentShiftId)');
    const insertManyG = db.transaction((gs) => {
      for (const g of gs) insertG.run(g);
    });
    insertManyG(demoGuards);
    console.log('Seeded guards into sqlite DB');
  } catch (err) {
    console.error('Failed to seed guards:', err);
  }
}

// GET all guards
app.get('/api/guards', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM guards ORDER BY id').all();
    res.json(rows.map(guardRowToObj));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET single guard
app.get('/api/guards/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(guardRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT update guard
app.put('/api/guards/:id', (req, res) => {
  const g = req.body;
  try {
    const update = db.prepare('UPDATE guards SET name=@name,phone=@phone,employeeId=@employeeId,siteId=@siteId,status=@status,lastSeen=@lastSeen,lat=@lat,lng=@lng,locationHistory=@locationHistory,clockedIn=@clockedIn,clockInTime=@clockInTime,currentShiftId=@currentShiftId WHERE id=@id');
    update.run({
      id: req.params.id,
      name: g.name,
      phone: g.phone,
      employeeId: g.employeeId,
      siteId: g.siteId || null,
      status: g.status || 'offline',
      lastSeen: g.lastSeen || new Date().toISOString(),
      lat: g.location ? g.location.lat : null,
      lng: g.location ? g.location.lng : null,
      locationHistory: g.locationHistory ? JSON.stringify(g.locationHistory) : null,
      clockedIn: g.clockedIn ? 1 : 0,
      clockInTime: g.clockInTime || null,
      currentShiftId: g.currentShiftId || null,
    });
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    res.json(guardRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`GuardSync local API running at http://localhost:${port}/api`));
