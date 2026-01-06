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

// Simple guards endpoint reading from mock data file (lightweight)
app.get('/api/guards', (req, res) => {
  try {
    const mock = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'mockData.ts'), 'utf-8');
    // naive extraction: find `export const mockGuards` and return empty or let frontend still use its mock
    res.json({ ok: true, note: 'Use frontend mock data or extend server to persist guards' });
  } catch (err) {
    res.json({ ok: false, error: String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`GuardSync local API running at http://localhost:${port}/api`));
