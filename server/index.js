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
  createdAt TEXT,
  patrolRoute TEXT
)`).run();

// Guards table
db.prepare(`CREATE TABLE IF NOT EXISTS guards (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  password TEXT,
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

// Add columns if they don't exist (for existing DBs)
try { db.prepare('ALTER TABLE guards ADD COLUMN email TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN password TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE sites ADD COLUMN patrolRoute TEXT').run(); } catch (e) { /* column exists */ }

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
  patrolRoute: row.patrolRoute ? JSON.parse(row.patrolRoute) : null,
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
  const insert = db.prepare('INSERT INTO sites (id,name,address,lat,lng,geofenceRadius,geofenceType,geofencePolygon,assignedGuards,isActive,createdAt,patrolRoute) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
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
      s.patrolRoute ? JSON.stringify(s.patrolRoute) : null,
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/sites/:id', (req, res) => {
  const s = req.body;
  const update = db.prepare('UPDATE sites SET name=@name,address=@address,lat=@lat,lng=@lng,geofenceRadius=@geofenceRadius,geofenceType=@geofenceType,geofencePolygon=@geofencePolygon,assignedGuards=@assignedGuards,isActive=@isActive,patrolRoute=@patrolRoute WHERE id=@id');
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
      patrolRoute: s.patrolRoute ? JSON.stringify(s.patrolRoute) : null,
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
  email: row.email || null,
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
      const insertG = db.prepare('INSERT INTO guards (id,name,phone,email,password,employeeId,siteId,status,lastSeen,lat,lng,locationHistory,clockedIn,clockInTime,currentShiftId) VALUES (@id,@name,@phone,@email,@password,@employeeId,@siteId,@status,@lastSeen,@lat,@lng,@locationHistory,@clockedIn,@clockInTime,@currentShiftId)');
      const insertManyG = db.transaction((gs) => {
        for (const g of gs) {
          insertG.run({
            id: g.id,
            name: g.name,
            phone: g.phone,
            email: g.email || null,
            password: g.password || null,
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

// Seed HBR Mini Forest demo site with patrol route if it doesn't exist
const hbrSiteExists = db.prepare("SELECT id FROM sites WHERE id = 'hbr-mini-forest'").get();
if (!hbrSiteExists) {
  // HBR Mini Forest location from Google Maps: https://maps.app.goo.gl/mAoceuPwsJoZhjeN7
  // Approx coords: 13.0358, 77.5970
  const hbrSite = {
    id: 'hbr-mini-forest',
    name: 'HBR Mini Forest',
    address: 'HBR Layout Mini Forest, Bengaluru, Karnataka',
    lat: 13.0358,
    lng: 77.5970,
    geofenceRadius: 200,
    geofenceType: 'radius',
    geofencePolygon: null,
    assignedGuards: JSON.stringify(['demo-guard-1', 'guard-hbr-2', 'guard-hbr-3', 'guard-hbr-4']),
    isActive: 1,
    createdAt: new Date().toISOString(),
    patrolRoute: JSON.stringify([
      { id: 'pp-hbr-1', name: 'Main Entrance', latitude: 13.0358, longitude: 77.5970, radiusMeters: 15, order: 1 },
      { id: 'pp-hbr-2', name: 'North Trail Start', latitude: 13.0362, longitude: 77.5968, radiusMeters: 15, order: 2 },
      { id: 'pp-hbr-3', name: 'Meditation Point', latitude: 13.0365, longitude: 77.5975, radiusMeters: 15, order: 3 },
      { id: 'pp-hbr-4', name: 'East Boundary', latitude: 13.0360, longitude: 77.5980, radiusMeters: 15, order: 4 },
      { id: 'pp-hbr-5', name: 'South Exit', latitude: 13.0354, longitude: 77.5972, radiusMeters: 15, order: 5 },
    ]),
  };
  db.prepare('INSERT INTO sites (id,name,address,lat,lng,geofenceRadius,geofenceType,geofencePolygon,assignedGuards,isActive,createdAt,patrolRoute) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    hbrSite.id, hbrSite.name, hbrSite.address, hbrSite.lat, hbrSite.lng,
    hbrSite.geofenceRadius, hbrSite.geofenceType, hbrSite.geofencePolygon,
    hbrSite.assignedGuards, hbrSite.isActive, hbrSite.createdAt, hbrSite.patrolRoute
  );
  console.log('Seeded HBR Mini Forest site with patrol route');
}

// Seed demo guards for HBR Mini Forest
const demoGuardExists = db.prepare("SELECT id FROM guards WHERE id = 'demo-guard-1'").get();
if (!demoGuardExists) {
  const demoGuards = [
    {
      id: 'demo-guard-1',
      name: 'Rajesh Kumar',
      phone: '+91 98765 43210',
      email: 'rajesh.kumar@guardwise.com',
      password: 'password123',
      employeeId: 'GW-2024-0147',
      siteId: 'hbr-mini-forest',
      status: 'online',
      lastSeen: new Date().toISOString(),
      lat: 13.0358,
      lng: 77.5970,
      locationHistory: '[]',
      clockedIn: 0,
      clockInTime: null,
      currentShiftId: null,
    },
    {
      id: 'guard-hbr-2',
      name: 'Suresh Reddy',
      phone: '+91 98765 43211',
      email: 'suresh.reddy@guardwise.com',
      password: null,
      employeeId: 'GW-2024-0148',
      siteId: 'hbr-mini-forest',
      status: 'offline',
      lastSeen: new Date().toISOString(),
      lat: 13.0360,
      lng: 77.5972,
      locationHistory: '[]',
      clockedIn: 0,
      clockInTime: null,
      currentShiftId: null,
    },
    {
      id: 'guard-hbr-3',
      name: 'Mohammed Farhan',
      phone: '+91 98765 43212',
      email: 'farhan.m@guardwise.com',
      password: null,
      employeeId: 'GW-2024-0149',
      siteId: 'hbr-mini-forest',
      status: 'offline',
      lastSeen: new Date().toISOString(),
      lat: 13.0362,
      lng: 77.5968,
      locationHistory: '[]',
      clockedIn: 0,
      clockInTime: null,
      currentShiftId: null,
    },
    {
      id: 'guard-hbr-4',
      name: 'Venkat Prasad',
      phone: '+91 98765 43213',
      email: 'venkat.p@guardwise.com',
      password: null,
      employeeId: 'GW-2024-0150',
      siteId: 'hbr-mini-forest',
      status: 'idle',
      lastSeen: new Date().toISOString(),
      lat: 13.0356,
      lng: 77.5974,
      locationHistory: '[]',
      clockedIn: 0,
      clockInTime: null,
      currentShiftId: null,
    },
  ];

  const insertDemoGuard = db.prepare('INSERT INTO guards (id,name,phone,email,password,employeeId,siteId,status,lastSeen,lat,lng,locationHistory,clockedIn,clockInTime,currentShiftId) VALUES (@id,@name,@phone,@email,@password,@employeeId,@siteId,@status,@lastSeen,@lat,@lng,@locationHistory,@clockedIn,@clockInTime,@currentShiftId)');
  const insertDemoGuards = db.transaction((guards) => {
    for (const g of guards) {
      insertDemoGuard.run(g);
    }
  });
  insertDemoGuards(demoGuards);
  console.log('Seeded demo guards for HBR Mini Forest (login: rajesh.kumar@guardwise.com / password123)');
}

// ============ AUTH ENDPOINTS ============

// POST /api/auth/login - Guard login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const guard = db.prepare('SELECT * FROM guards WHERE email = ?').get(email);
    
    if (!guard) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Simple password comparison (in production, use bcrypt)
    if (guard.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get the guard's assigned site with patrol route
    let site = null;
    if (guard.siteId) {
      const siteRow = db.prepare('SELECT * FROM sites WHERE id = ?').get(guard.siteId);
      if (siteRow) {
        site = siteRowToObj(siteRow);
      }
    }

    res.json({
      success: true,
      guard: guardRowToObj(guard),
      site: site,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

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
