import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'server', 'data', 'gw.db');
const INITIAL_JSON = path.join(process.cwd(), 'server', 'initialData.json');

if (!fs.existsSync(INITIAL_JSON)) {
  console.error('initialData.json not found');
  process.exit(1);
}

const raw = fs.readFileSync(INITIAL_JSON, 'utf8');
const parsed = JSON.parse(raw);

const db = new Database(DB_PATH);

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

if (!Array.isArray(parsed.guards) || parsed.guards.length === 0) {
  console.error('No guards in initialData.json to seed');
  process.exit(1);
}

const insert = db.prepare('INSERT OR REPLACE INTO guards (id,name,phone,employeeId,siteId,status,lastSeen,lat,lng,locationHistory,clockedIn,clockInTime,currentShiftId) VALUES (@id,@name,@phone,@employeeId,@siteId,@status,@lastSeen,@lat,@lng,@locationHistory,@clockedIn,@clockInTime,@currentShiftId)');

const insertMany = db.transaction((guards) => {
  for (const g of guards) {
    insert.run({
      id: g.id,
      name: g.name,
      phone: g.phone,
      employeeId: g.employeeId,
      siteId: g.siteId,
      status: g.status,
      lastSeen: g.lastSeen || new Date().toISOString(),
      lat: g.location ? g.location.lat : null,
      lng: g.location ? g.location.lng : null,
      locationHistory: JSON.stringify(g.locationHistory || []),
      clockedIn: g.clockedIn ? 1 : 0,
      clockInTime: g.clockInTime || null,
      currentShiftId: g.currentShiftId || null,
    });
  }
});

insertMany(parsed.guards);

console.log(`Seeded/updated ${parsed.guards.length} guards into ${DB_PATH}`);

db.close();
