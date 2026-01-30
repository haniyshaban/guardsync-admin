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

// Seed guards table with guards from initialData.json if empty
const guardCount = db.prepare('SELECT COUNT(*) as c FROM guards').get().c;
if (guardCount === 0) {
  try {
    const raw = fs.readFileSync(INITIAL_JSON, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.guards)) {
      const insertG = db.prepare('INSERT INTO guards (id,name,phone,employeeId,siteId,status,lastSeen,lat,lng,locationHistory,clockedIn,clockInTime,currentShiftId) VALUES (@id,@name,@phone,@employeeId,@siteId,@status,@lastSeen,@lat,@lng,@locationHistory,@clockedIn,@clockInTime,@currentShiftId)');
      const insertManyG = db.transaction((gs) => {
        for (const g of gs) {
          insertG.run({
            id: g.id,
            name: g.name,
            phone: g.phone,
            employeeId: g.employeeId,
            siteId: g.siteId,
            status: g.status,
            lastSeen: g.lastSeen,
            lat: g.location.lat,
            lng: g.location.lng,
            locationHistory: JSON.stringify(g.locationHistory || []),
            clockedIn: g.clockedIn ? 1 : 0,
            clockInTime: g.clockInTime || null,
            currentShiftId: g.currentShiftId || null
          });
        }
      });
      insertManyG(parsed.guards);
      console.log('Seeded guards from initialData.json into sqlite DB');
    }
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
