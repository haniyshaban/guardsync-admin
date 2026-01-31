import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Setup file upload storage
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and PDF are allowed.'));
    }
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

const DB_PATH = path.join(__dirname, 'data', 'gw.db');
const INITIAL_JSON = path.join(__dirname, 'initialData.json');

// ensure data directory
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

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
  currentShiftId TEXT,
  -- Personal details (encrypted in production)
  address TEXT,
  emergencyContact TEXT,
  dateOfJoining TEXT,
  dailyRate REAL,
  -- Sensitive documents (should be encrypted in production)
  aadharNumber TEXT,
  panNumber TEXT,
  -- Document URLs
  photographUrl TEXT,
  aadharDocUrl TEXT,
  panDocUrl TEXT,
  relievingLetterUrl TEXT,
  -- Bank details
  bankAccountNumber TEXT,
  bankIfsc TEXT,
  bankName TEXT,
  accountHolderName TEXT,
  -- Shift assignment
  shiftType TEXT DEFAULT 'day',
  shiftStartTime TEXT DEFAULT '08:00',
  shiftEndTime TEXT DEFAULT '20:00',
  -- Face recognition
  faceDescriptor TEXT
)`).run();

// Leave requests table
db.prepare(`CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  reason TEXT,
  leaveType TEXT DEFAULT 'casual',
  status TEXT DEFAULT 'pending',
  appliedAt TEXT,
  reviewedAt TEXT,
  reviewedBy TEXT,
  adminNotes TEXT,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Conveyance requests table
db.prepare(`CREATE TABLE IF NOT EXISTS conveyance_requests (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  guardName TEXT,
  siteId TEXT,
  siteName TEXT,
  reason TEXT NOT NULL,
  estimatedDuration INTEGER,
  currentLat REAL,
  currentLng REAL,
  requestedAt TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  respondedAt TEXT,
  respondedBy TEXT,
  staffNotes TEXT,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Field reports table (for staff voice notes and video reports)
db.prepare(`CREATE TABLE IF NOT EXISTS field_reports (
  id TEXT PRIMARY KEY,
  staffId TEXT NOT NULL,
  staffName TEXT,
  reportType TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mediaUrl TEXT,
  mediaType TEXT,
  siteId TEXT,
  siteName TEXT,
  lat REAL,
  lng REAL,
  createdAt TEXT NOT NULL,
  tags TEXT
)`).run();

// SOS alerts table
db.prepare(`CREATE TABLE IF NOT EXISTS sos_alerts (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  guardName TEXT,
  siteId TEXT,
  siteName TEXT,
  lat REAL,
  lng REAL,
  message TEXT,
  status TEXT DEFAULT 'active',
  createdAt TEXT NOT NULL,
  resolvedAt TEXT,
  resolvedBy TEXT,
  resolvedNotes TEXT,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Staff table for field officers
db.prepare(`CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password TEXT,
  phone TEXT,
  employeeId TEXT,
  role TEXT DEFAULT 'field_officer',
  assignedArea TEXT,
  status TEXT DEFAULT 'offline',
  createdAt TEXT
)`).run();

// Staff attendance table
db.prepare(`CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,
  staffId TEXT NOT NULL,
  clockInTime TEXT NOT NULL,
  clockOutTime TEXT,
  shiftType TEXT,
  lat REAL,
  lng REAL,
  date TEXT NOT NULL,
  FOREIGN KEY (staffId) REFERENCES staff(id)
)`).run();

// Guard attendance table (for tracking clock in/out of guards)
db.prepare(`CREATE TABLE IF NOT EXISTS guard_attendance (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  siteId TEXT,
  clockIn TEXT NOT NULL,
  clockOut TEXT,
  withinGeofence INTEGER DEFAULT 1,
  lat REAL,
  lng REAL,
  date TEXT NOT NULL,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// System configuration table
db.prepare(`CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  usePremiumAPIs INTEGER DEFAULT 0,
  faceRecognition TEXT DEFAULT 'local',
  mapProvider TEXT DEFAULT 'openstreetmap',
  locationUpdateInterval INTEGER DEFAULT 30,
  geofenceStrictness TEXT DEFAULT 'medium',
  autoClockOut INTEGER DEFAULT 1,
  updatedAt TEXT
)`).run();

// Support tickets table
db.prepare(`CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  createdAt TEXT NOT NULL,
  resolvedAt TEXT,
  resolvedBy TEXT,
  response TEXT
)`).run();

// Guard notifications table
db.prepare(`CREATE TABLE IF NOT EXISTS guard_notifications (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  isRead INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Guard schedules table
db.prepare(`CREATE TABLE IF NOT EXISTS guard_schedules (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  siteId TEXT,
  siteName TEXT,
  date TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  isNightShift INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Patrol logs table
db.prepare(`CREATE TABLE IF NOT EXISTS patrol_logs (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  siteId TEXT,
  patrolPointId TEXT NOT NULL,
  patrolPointName TEXT NOT NULL,
  shiftId TEXT,
  lat REAL,
  lng REAL,
  withinRadius INTEGER DEFAULT 1,
  distanceFromPoint REAL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Payroll table for guard salaries
db.prepare(`CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY,
  guardId TEXT NOT NULL,
  guardName TEXT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  totalDaysWorked INTEGER DEFAULT 0,
  dailyRate REAL DEFAULT 800,
  grossPay REAL DEFAULT 0,
  uniformDeduction REAL DEFAULT 0,
  pfDeduction REAL DEFAULT 0,
  otherDeductions REAL DEFAULT 0,
  netPay REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  generatedAt TEXT,
  finalizedAt TEXT,
  paidAt TEXT,
  FOREIGN KEY (guardId) REFERENCES guards(id)
)`).run();

// Insert default system config if not exists
const configExists = db.prepare('SELECT id FROM system_config WHERE id = ?').get('main');
if (!configExists) {
  db.prepare(`INSERT INTO system_config (id, usePremiumAPIs, faceRecognition, mapProvider, locationUpdateInterval, geofenceStrictness, autoClockOut, updatedAt) 
    VALUES ('main', 0, 'local', 'openstreetmap', 30, 'medium', 1, ?)`).run(new Date().toISOString());
}

// Add columns if they don't exist (for existing DBs)
try { db.prepare('ALTER TABLE guards ADD COLUMN email TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN password TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN address TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN emergencyContact TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN dateOfJoining TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN dailyRate REAL').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN aadharNumber TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN panNumber TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN bankAccountNumber TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN bankIfsc TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN bankName TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN accountHolderName TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN shiftType TEXT DEFAULT "day"').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN shiftStartTime TEXT DEFAULT "08:00"').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN shiftEndTime TEXT DEFAULT "20:00"').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN faceDescriptor TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN photographUrl TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN aadharDocUrl TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN panDocUrl TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE guards ADD COLUMN relievingLetterUrl TEXT').run(); } catch (e) { /* column exists */ }
try { db.prepare('ALTER TABLE sites ADD COLUMN patrolRoute TEXT').run(); } catch (e) { /* column exists */ }

// Seed from initialData.json if empty
const rowCount = db.prepare('SELECT COUNT(*) as c FROM sites').get().c;
if (rowCount === 0) {
  try {
    const raw = fs.readFileSync(INITIAL_JSON, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sites)) {
      const insert = db.prepare(`INSERT INTO sites (id,name,address,lat,lng,geofenceRadius,geofenceType,geofencePolygon,assignedGuards,isActive,createdAt,patrolRoute)
        VALUES (@id,@name,@address,@lat,@lng,@geofenceRadius,@geofenceType,@geofencePolygon,@assignedGuards,@isActive,@createdAt,@patrolRoute)`);
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
            patrolRoute: s.patrolRoute ? JSON.stringify(s.patrolRoute) : null,
          });
        }
      });
      insertMany(parsed.sites);
      console.log(`Seeded ${parsed.sites.length} sites from initialData.json`);
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
  // Personal details
  address: row.address || null,
  emergencyContact: row.emergencyContact || null,
  dateOfJoining: row.dateOfJoining || null,
  dailyRate: row.dailyRate || null,
  // Documents (masked for security - only last 4 digits shown)
  aadharNumber: row.aadharNumber ? `XXXX-XXXX-${row.aadharNumber.slice(-4)}` : null,
  aadharNumberFull: row.aadharNumber || null,
  panNumber: row.panNumber || null,
  // Document URLs
  documents: {
    photographUrl: row.photographUrl || null,
    aadharDocUrl: row.aadharDocUrl || null,
    panDocUrl: row.panDocUrl || null,
    relievingLetterUrl: row.relievingLetterUrl || null,
  },
  // Bank details
  bankDetails: row.bankAccountNumber ? {
    accountNumber: `XXXXXX${row.bankAccountNumber.slice(-4)}`,
    ifsc: row.bankIfsc,
    bankName: row.bankName,
    accountHolderName: row.accountHolderName,
  } : null,
  bankAccountNumber: row.bankAccountNumber || null,
  bankIfsc: row.bankIfsc || null,
  bankName: row.bankName || null,
  accountHolderName: row.accountHolderName || null,
  // Shift assignment
  shiftType: row.shiftType || 'day',
  shiftStartTime: row.shiftStartTime || '08:00',
  shiftEndTime: row.shiftEndTime || '20:00',
  // Face descriptor for recognition (returned as-is for matching)
  faceDescriptor: row.faceDescriptor || null,
});

// helper to map leave request row to object
const leaveRowToObj = (row) => ({
  id: row.id,
  guardId: row.guardId,
  startDate: row.startDate,
  endDate: row.endDate,
  reason: row.reason,
  leaveType: row.leaveType,
  status: row.status,
  appliedAt: row.appliedAt,
  reviewedAt: row.reviewedAt,
  reviewedBy: row.reviewedBy,
  adminNotes: row.adminNotes,
});

// Seed guards table with guards from initialData.json if empty
const guardCount = db.prepare('SELECT COUNT(*) as c FROM guards').get().c;
if (guardCount === 0) {
  try {
    const raw = fs.readFileSync(INITIAL_JSON, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.guards)) {
      const insertG = db.prepare(`INSERT INTO guards (
        id, name, phone, email, password, employeeId, siteId, status, lastSeen, lat, lng,
        locationHistory, clockedIn, clockInTime, currentShiftId,
        address, emergencyContact, dateOfJoining, dailyRate,
        aadharNumber, panNumber, bankAccountNumber, bankIfsc, bankName, accountHolderName,
        shiftType, shiftStartTime, shiftEndTime
      ) VALUES (
        @id, @name, @phone, @email, @password, @employeeId, @siteId, @status, @lastSeen, @lat, @lng,
        @locationHistory, @clockedIn, @clockInTime, @currentShiftId,
        @address, @emergencyContact, @dateOfJoining, @dailyRate,
        @aadharNumber, @panNumber, @bankAccountNumber, @bankIfsc, @bankName, @accountHolderName,
        @shiftType, @shiftStartTime, @shiftEndTime
      )`);
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
            lat: g.location?.lat || null,
            lng: g.location?.lng || null,
            locationHistory: JSON.stringify(g.locationHistory || []),
            clockedIn: g.clockedIn ? 1 : 0,
            clockInTime: g.clockInTime || null,
            currentShiftId: g.currentShiftId || null,
            address: g.address || null,
            emergencyContact: g.emergencyContact || null,
            dateOfJoining: g.dateOfJoining || null,
            dailyRate: g.dailyRate || 750,
            aadharNumber: g.aadharNumber || null,
            panNumber: g.panNumber || null,
            bankAccountNumber: g.bankAccountNumber || null,
            bankIfsc: g.bankIfsc || null,
            bankName: g.bankName || null,
            accountHolderName: g.accountHolderName || null,
            shiftType: g.shiftType || 'day',
            shiftStartTime: g.shiftStartTime || '08:00',
            shiftEndTime: g.shiftEndTime || '20:00',
          });
        }
      });
      insertManyG(parsed.guards);
      console.log(`Seeded ${parsed.guards.length} guards from initialData.json`);
    }
  } catch (err) {
    console.error('Failed to seed guards:', err);
  }
}

// Seed staff from initialData.json if empty
const staffCount = db.prepare('SELECT COUNT(*) as c FROM staff').get().c;
if (staffCount === 0) {
  try {
    const raw = fs.readFileSync(INITIAL_JSON, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.staff)) {
      const insertS = db.prepare(`INSERT INTO staff (id, name, email, password, phone, employeeId, role, assignedArea, status, createdAt)
        VALUES (@id, @name, @email, @password, @phone, @employeeId, @role, @assignedArea, @status, @createdAt)`);
      const insertManyS = db.transaction((staffList) => {
        for (const s of staffList) {
          insertS.run({
            id: s.id,
            name: s.name,
            email: s.email,
            password: s.password,
            phone: s.phone,
            employeeId: s.employeeId,
            role: s.role,
            assignedArea: s.assignedArea,
            status: s.status || 'offline',
            createdAt: s.createdAt || new Date().toISOString(),
          });
        }
      });
      insertManyS(parsed.staff);
      console.log(`Seeded ${parsed.staff.length} staff members from initialData.json`);
    }
  } catch (err) {
    console.error('Failed to seed staff:', err);
  }
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

// GET /api/auth/face-descriptors - Get all guards with face descriptors for facial recognition login
app.get('/api/auth/face-descriptors', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, faceDescriptor FROM guards WHERE faceDescriptor IS NOT NULL').all();
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      descriptor: row.faceDescriptor,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/auth/face-login - Login with face descriptor (guard ID from face match)
app.post('/api/auth/face-login', (req, res) => {
  const { guardId } = req.body;
  
  if (!guardId) {
    return res.status(400).json({ error: 'Guard ID is required' });
  }

  try {
    const guard = db.prepare('SELECT * FROM guards WHERE id = ?').get(guardId);
    
    if (!guard) {
      return res.status(401).json({ error: 'Guard not found' });
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

// ============ FILE UPLOAD ENDPOINT ============

// POST /api/upload - Upload a single file (photograph, aadhar, pan, relieving letter)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`File uploaded: ${req.file.originalname} -> ${fileUrl}`);
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ============ GUARD ENROLLMENT ENDPOINT ============

// POST /api/guards/enroll - New guard enrollment (creates a new guard record)
app.post('/api/guards/enroll', (req, res) => {
  const {
    fullName, email, phone, address, emergencyContact,
    aadharNumber, panNumber, bankAccountNumber, bankIfsc,
    bankName, accountHolderName, faceDescriptor, password,
    photographUrl, aadharDocUrl, panDocUrl, relievingLetterUrl
  } = req.body;

  // Validation
  if (!fullName || !email || !phone) {
    return res.status(400).json({ error: 'fullName, email, and phone are required' });
  }

  // Check if email already exists
  const existingGuard = db.prepare('SELECT id FROM guards WHERE email = ?').get(email);
  if (existingGuard) {
    return res.status(409).json({ error: 'A guard with this email already exists' });
  }

  // Generate unique ID and employee ID
  const id = `guard-${Date.now()}`;
  const employeeId = `GW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  const dateOfJoining = new Date().toISOString().split('T')[0];
  const createdAt = new Date().toISOString();

  try {
    const insert = db.prepare(`INSERT INTO guards (
      id, name, phone, email, password, employeeId, siteId, status, lastSeen, lat, lng, 
      locationHistory, clockedIn, clockInTime, currentShiftId,
      address, emergencyContact, dateOfJoining, dailyRate,
      aadharNumber, panNumber, photographUrl, aadharDocUrl, panDocUrl, relievingLetterUrl,
      bankAccountNumber, bankIfsc, bankName, accountHolderName,
      shiftType, shiftStartTime, shiftEndTime, faceDescriptor
    ) VALUES (
      @id, @name, @phone, @email, @password, @employeeId, @siteId, @status, @lastSeen, @lat, @lng,
      @locationHistory, @clockedIn, @clockInTime, @currentShiftId,
      @address, @emergencyContact, @dateOfJoining, @dailyRate,
      @aadharNumber, @panNumber, @photographUrl, @aadharDocUrl, @panDocUrl, @relievingLetterUrl,
      @bankAccountNumber, @bankIfsc, @bankName, @accountHolderName,
      @shiftType, @shiftStartTime, @shiftEndTime, @faceDescriptor
    )`);

    insert.run({
      id,
      name: fullName,
      phone,
      email,
      password: password || null, // Allow setting password during enrollment
      employeeId,
      siteId: null, // Will be assigned later by admin
      status: 'pending', // New guards start as pending
      lastSeen: createdAt,
      lat: null,
      lng: null,
      locationHistory: '[]',
      clockedIn: 0,
      clockInTime: null,
      currentShiftId: null,
      address: address || null,
      emergencyContact: emergencyContact || null,
      dateOfJoining,
      dailyRate: 750, // Default daily rate
      aadharNumber: aadharNumber ? aadharNumber.replace(/\\D/g, '') : null,
      panNumber: panNumber ? panNumber.toUpperCase() : null,
      photographUrl: photographUrl || null,
      aadharDocUrl: aadharDocUrl || null,
      panDocUrl: panDocUrl || null,
      relievingLetterUrl: relievingLetterUrl || null,
      bankAccountNumber: bankAccountNumber || null,
      bankIfsc: bankIfsc ? bankIfsc.toUpperCase() : null,
      bankName: bankName || null,
      accountHolderName: accountHolderName || null,
      shiftType: 'day',
      shiftStartTime: '08:00',
      shiftEndTime: '20:00',
      faceDescriptor: faceDescriptor || null,
    });

    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(id);
    
    console.log(`New guard enrolled: ${fullName} (${email}) - ID: ${employeeId}`);
    
    res.status(201).json({
      success: true,
      message: 'Guard enrolled successfully',
      guard: guardRowToObj(row),
    });
  } catch (err) {
    console.error('Enrollment error:', err);
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

// PUT update guard (partial update - only updates provided fields)
app.put('/api/guards/:id', (req, res) => {
  const g = req.body;
  try {
    // Get current guard data first
    const currentGuard = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    if (!currentGuard) {
      return res.status(404).json({ error: 'Guard not found' });
    }
    
    // Merge with existing data - only update fields that are provided
    const merged = {
      name: g.name !== undefined ? g.name : currentGuard.name,
      phone: g.phone !== undefined ? g.phone : currentGuard.phone,
      employeeId: g.employeeId !== undefined ? g.employeeId : currentGuard.employeeId,
      siteId: g.siteId !== undefined ? (g.siteId || null) : currentGuard.siteId,
      status: g.status !== undefined ? g.status : currentGuard.status,
      lastSeen: g.lastSeen !== undefined ? g.lastSeen : (currentGuard.lastSeen || new Date().toISOString()),
      lat: g.location !== undefined ? (g.location ? g.location.lat : null) : currentGuard.lat,
      lng: g.location !== undefined ? (g.location ? g.location.lng : null) : currentGuard.lng,
      locationHistory: g.locationHistory !== undefined ? JSON.stringify(g.locationHistory) : currentGuard.locationHistory,
      clockedIn: g.clockedIn !== undefined ? (g.clockedIn ? 1 : 0) : currentGuard.clockedIn,
      clockInTime: g.clockInTime !== undefined ? (g.clockInTime || null) : currentGuard.clockInTime,
      currentShiftId: g.currentShiftId !== undefined ? (g.currentShiftId || null) : currentGuard.currentShiftId,
    };
    
    // Determine status: if siteId is being set to null and guard isn't pending, set to unassigned
    if (currentGuard.status !== 'pending') {
      if (g.siteId !== undefined && !g.siteId) {
        // siteId is explicitly being set to null/empty - mark as unassigned
        merged.status = 'unassigned';
      } else if (g.siteId && currentGuard.status === 'unassigned') {
        // Being assigned to a site from unassigned - set to offline (will go online when clocked in)
        merged.status = 'offline';
      }
    }
    
    const update = db.prepare('UPDATE guards SET name=@name,phone=@phone,employeeId=@employeeId,siteId=@siteId,status=@status,lastSeen=@lastSeen,lat=@lat,lng=@lng,locationHistory=@locationHistory,clockedIn=@clockedIn,clockInTime=@clockInTime,currentShiftId=@currentShiftId WHERE id=@id');
    update.run({
      id: req.params.id,
      ...merged
    });
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    res.json(guardRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE guard
app.delete('/api/guards/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Guard not found' });
    
    // Disable foreign key checks temporarily
    db.pragma('foreign_keys = OFF');
    
    // Delete all related records from all tables with guardId foreign key
    try { db.prepare('DELETE FROM leave_requests WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('leave_requests:', e.message); }
    try { db.prepare('DELETE FROM conveyance_requests WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('conveyance_requests:', e.message); }
    try { db.prepare('DELETE FROM sos_alerts WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('sos_alerts:', e.message); }
    try { db.prepare('DELETE FROM guard_attendance WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('guard_attendance:', e.message); }
    try { db.prepare('DELETE FROM guard_schedules WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('guard_schedules:', e.message); }
    try { db.prepare('DELETE FROM guard_notifications WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('guard_notifications:', e.message); }
    try { db.prepare('DELETE FROM patrol_logs WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('patrol_logs:', e.message); }
    try { db.prepare('DELETE FROM payroll WHERE guardId = ?').run(req.params.id); } catch(e) { console.log('payroll:', e.message); }
    
    // Delete the guard
    db.prepare('DELETE FROM guards WHERE id = ?').run(req.params.id);
    
    // Re-enable foreign key checks
    db.pragma('foreign_keys = ON');
    
    console.log(`Guard deleted: ${row.name} (${row.email}) - ID: ${row.employeeId}`);
    
    res.json({ 
      success: true, 
      message: 'Guard deleted successfully',
      deletedGuard: {
        id: row.id,
        name: row.name,
        employeeId: row.employeeId,
      }
    });
  } catch (err) {
    // Re-enable foreign key checks even on error
    try { db.pragma('foreign_keys = ON'); } catch(e) {}
    console.error('Delete guard error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/guards/:id/approve - Approve a pending guard enrollment
app.post('/api/guards/:id/approve', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Guard not found' });
    
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'Guard is not in pending status' });
    }
    
    // Determine the new status based on clock-in state
    // If guard hasn't clocked in, they go to 'offline', otherwise based on activity
    const newStatus = row.clockedIn ? 'online' : 'offline';
    
    db.prepare('UPDATE guards SET status = ? WHERE id = ?').run(newStatus, req.params.id);
    
    const updatedRow = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    
    console.log(`Guard approved: ${row.name} (${row.email}) - Status: ${newStatus}`);
    
    res.json({
      success: true,
      message: 'Guard enrollment approved successfully',
      guard: guardRowToObj(updatedRow),
    });
  } catch (err) {
    console.error('Approve guard error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/guards/:id/reject - Reject a pending guard enrollment
app.post('/api/guards/:id/reject', (req, res) => {
  try {
    const { reason } = req.body;
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Guard not found' });
    
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'Guard is not in pending status' });
    }
    
    // Delete the guard record (rejection means they're not enrolled)
    db.prepare('DELETE FROM guards WHERE id = ?').run(req.params.id);
    
    console.log(`Guard enrollment rejected: ${row.name} (${row.email}) - Reason: ${reason || 'Not specified'}`);
    
    res.json({
      success: true,
      message: 'Guard enrollment rejected',
      rejectedGuard: {
        id: row.id,
        name: row.name,
        email: row.email,
        reason: reason || null,
      }
    });
  } catch (err) {
    console.error('Reject guard error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ============ LEAVE REQUESTS ENDPOINTS ============

// GET leave requests for a guard
app.get('/api/leave-requests', (req, res) => {
  try {
    const { guardId } = req.query;
    let rows;
    if (guardId) {
      rows = db.prepare('SELECT * FROM leave_requests WHERE guardId = ? ORDER BY appliedAt DESC').all(guardId);
    } else {
      rows = db.prepare('SELECT * FROM leave_requests ORDER BY appliedAt DESC').all();
    }
    res.json(rows.map(leaveRowToObj));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET single leave request
app.get('/api/leave-requests/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(leaveRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST create leave request
app.post('/api/leave-requests', (req, res) => {
  const l = req.body;
  const id = `leave-${Date.now()}`;
  try {
    const insert = db.prepare(`INSERT INTO leave_requests (
      id, guardId, startDate, endDate, reason, leaveType, status, appliedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insert.run(
      id,
      l.guardId,
      l.startDate,
      l.endDate,
      l.reason,
      l.leaveType || 'casual',
      'pending',
      new Date().toISOString()
    );
    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    res.status(201).json(leaveRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT update leave request (for admin approval/rejection)
app.put('/api/leave-requests/:id', (req, res) => {
  const l = req.body;
  try {
    const update = db.prepare(`UPDATE leave_requests SET 
      status = @status, 
      reviewedAt = @reviewedAt, 
      reviewedBy = @reviewedBy, 
      adminNotes = @adminNotes 
      WHERE id = @id`);
    update.run({
      id: req.params.id,
      status: l.status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: l.reviewedBy || null,
      adminNotes: l.adminNotes || null,
    });
    const row = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(leaveRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE leave request
app.delete('/api/leave-requests/:id', (req, res) => {
  try {
    const del = db.prepare('DELETE FROM leave_requests WHERE id = ?');
    del.run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ GUARD PROFILE UPDATE (for personal details) ============

// PUT update guard profile/personal details
app.put('/api/guards/:id/profile', (req, res) => {
  const g = req.body;
  try {
    const update = db.prepare(`UPDATE guards SET 
      address = @address,
      emergencyContact = @emergencyContact,
      aadharNumber = @aadharNumber,
      panNumber = @panNumber,
      bankAccountNumber = @bankAccountNumber,
      bankIfsc = @bankIfsc,
      bankName = @bankName,
      accountHolderName = @accountHolderName,
      faceDescriptor = @faceDescriptor
      WHERE id = @id`);
    update.run({
      id: req.params.id,
      address: g.address || null,
      emergencyContact: g.emergencyContact || null,
      aadharNumber: g.aadharNumber || null,
      panNumber: g.panNumber || null,
      bankAccountNumber: g.bankAccountNumber || null,
      bankIfsc: g.bankIfsc || null,
      bankName: g.bankName || null,
      accountHolderName: g.accountHolderName || null,
      faceDescriptor: g.faceDescriptor || null,
    });
    const row = db.prepare('SELECT * FROM guards WHERE id = ?').get(req.params.id);
    res.json(guardRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ CONVEYANCE REQUEST ENDPOINTS ============

// Helper to map conveyance request row to object
const conveyanceRowToObj = (row) => ({
  id: row.id,
  guardId: row.guardId,
  guardName: row.guardName,
  siteId: row.siteId,
  siteName: row.siteName,
  reason: row.reason,
  estimatedDuration: row.estimatedDuration,
  currentLocation: (row.currentLat !== null && row.currentLng !== null) 
    ? { lat: row.currentLat, lng: row.currentLng } 
    : undefined,
  requestedAt: row.requestedAt,
  status: row.status,
  respondedAt: row.respondedAt,
  respondedBy: row.respondedBy,
  staffNotes: row.staffNotes,
});

// POST /api/conveyance/request - Guard submits a conveyance request
app.post('/api/conveyance/request', (req, res) => {
  const { guardId, siteId, reason, estimatedDuration, currentLocation } = req.body;

  if (!guardId || !reason) {
    return res.status(400).json({ error: 'guardId and reason are required' });
  }

  // Get guard and site details
  const guard = db.prepare('SELECT name, siteId FROM guards WHERE id = ?').get(guardId);
  if (!guard) {
    return res.status(404).json({ error: 'Guard not found' });
  }

  const actualSiteId = siteId || guard.siteId;
  let siteName = null;
  if (actualSiteId) {
    const site = db.prepare('SELECT name FROM sites WHERE id = ?').get(actualSiteId);
    siteName = site?.name || null;
  }

  const id = `conv-${Date.now()}`;
  const requestedAt = new Date().toISOString();

  try {
    const insert = db.prepare(`INSERT INTO conveyance_requests (
      id, guardId, guardName, siteId, siteName, reason, estimatedDuration, 
      currentLat, currentLng, requestedAt, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    insert.run(
      id,
      guardId,
      guard.name,
      actualSiteId,
      siteName,
      reason,
      estimatedDuration || 30,
      currentLocation?.lat || null,
      currentLocation?.lng || null,
      requestedAt,
      'pending'
    );

    const row = db.prepare('SELECT * FROM conveyance_requests WHERE id = ?').get(id);
    res.status(201).json(conveyanceRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/conveyance/pending - Staff gets all pending conveyance requests
app.get('/api/conveyance/pending', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM conveyance_requests WHERE status = 'pending' ORDER BY requestedAt DESC").all();
    res.json(rows.map(conveyanceRowToObj));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/conveyance/status/:guardId - Get current conveyance request status for a guard
app.get('/api/conveyance/status/:guardId', (req, res) => {
  try {
    // Get the most recent request (pending or approved within last 2 hours)
    const row = db.prepare(`
      SELECT * FROM conveyance_requests 
      WHERE guardId = ? 
      AND (status = 'pending' OR (status = 'approved' AND datetime(respondedAt) > datetime('now', '-2 hours')))
      ORDER BY requestedAt DESC 
      LIMIT 1
    `).get(req.params.guardId);

    if (!row) {
      return res.json(null);
    }
    res.json(conveyanceRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/conveyance/:id/respond - Staff approves or denies a request
app.put('/api/conveyance/:id/respond', (req, res) => {
  const { action, staffId, notes } = req.body;

  if (!action || !['approve', 'deny'].includes(action)) {
    return res.status(400).json({ error: "action must be 'approve' or 'deny'" });
  }

  try {
    const status = action === 'approve' ? 'approved' : 'denied';
    const respondedAt = new Date().toISOString();

    const update = db.prepare(`UPDATE conveyance_requests SET 
      status = ?, respondedAt = ?, respondedBy = ?, staffNotes = ? 
      WHERE id = ?`);
    update.run(status, respondedAt, staffId || null, notes || null, req.params.id);

    const row = db.prepare('SELECT * FROM conveyance_requests WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(conveyanceRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/conveyance/:id - Guard cancels a pending request
app.delete('/api/conveyance/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM conveyance_requests WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    db.prepare('DELETE FROM conveyance_requests WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/conveyance/history/:guardId - Get conveyance request history for a guard
app.get('/api/conveyance/history/:guardId', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM conveyance_requests WHERE guardId = ? ORDER BY requestedAt DESC LIMIT 50').all(req.params.guardId);
    res.json(rows.map(conveyanceRowToObj));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ FIELD REPORTS ENDPOINTS (Staff) ============

// Helper to map field report row to object
const fieldReportRowToObj = (row) => ({
  id: row.id,
  staffId: row.staffId,
  staffName: row.staffName,
  reportType: row.reportType,
  title: row.title,
  description: row.description,
  mediaUrl: row.mediaUrl,
  mediaType: row.mediaType,
  siteId: row.siteId,
  siteName: row.siteName,
  location: (row.lat !== null && row.lng !== null) 
    ? { lat: row.lat, lng: row.lng } 
    : undefined,
  createdAt: row.createdAt,
  tags: row.tags ? JSON.parse(row.tags) : [],
});

// POST /api/reports/field - Staff uploads a field report
app.post('/api/reports/field', (req, res) => {
  const { staffId, staffName, reportType, title, description, mediaUrl, mediaType, siteId, siteName, location, tags } = req.body;

  if (!staffId || !reportType || !title) {
    return res.status(400).json({ error: 'staffId, reportType, and title are required' });
  }

  const id = `report-${Date.now()}`;
  const createdAt = new Date().toISOString();

  try {
    const insert = db.prepare(`INSERT INTO field_reports (
      id, staffId, staffName, reportType, title, description, mediaUrl, mediaType, 
      siteId, siteName, lat, lng, createdAt, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    insert.run(
      id,
      staffId,
      staffName || null,
      reportType,
      title,
      description || null,
      mediaUrl || null,
      mediaType || null,
      siteId || null,
      siteName || null,
      location?.lat || null,
      location?.lng || null,
      createdAt,
      tags ? JSON.stringify(tags) : null
    );

    const row = db.prepare('SELECT * FROM field_reports WHERE id = ?').get(id);
    res.status(201).json(fieldReportRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/reports/field - Get field reports (optionally filter by staffId)
app.get('/api/reports/field', (req, res) => {
  try {
    const { staffId } = req.query;
    let rows;
    if (staffId) {
      rows = db.prepare('SELECT * FROM field_reports WHERE staffId = ? ORDER BY createdAt DESC').all(staffId);
    } else {
      rows = db.prepare('SELECT * FROM field_reports ORDER BY createdAt DESC LIMIT 100').all();
    }
    res.json(rows.map(fieldReportRowToObj));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/reports/field/:id - Get a single field report
app.get('/api/reports/field/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM field_reports WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(fieldReportRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ STAFF AUTHENTICATION & MANAGEMENT ============

// POST /api/staff/login - Staff login
app.post('/api/staff/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const staff = db.prepare('SELECT * FROM staff WHERE email = ?').get(email);
    if (!staff || staff.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        employeeId: staff.employeeId,
        role: staff.role,
        assignedArea: staff.assignedArea,
        status: staff.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/staff/attendance/clock-in - Staff clock in
app.post('/api/staff/attendance/clock-in', (req, res) => {
  const { staffId, shiftType, location } = req.body;

  if (!staffId) {
    return res.status(400).json({ error: 'staffId is required' });
  }

  const id = `att-${Date.now()}`;
  const clockInTime = new Date().toISOString();
  const date = new Date().toISOString().split('T')[0];

  try {
    const insert = db.prepare(`INSERT INTO staff_attendance (
      id, staffId, clockInTime, shiftType, lat, lng, date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    insert.run(
      id,
      staffId,
      clockInTime,
      shiftType || 'general',
      location?.lat || null,
      location?.lng || null,
      date
    );

    // Update staff status
    db.prepare("UPDATE staff SET status = 'on_duty' WHERE id = ?").run(staffId);

    const row = db.prepare('SELECT * FROM staff_attendance WHERE id = ?').get(id);
    res.status(201).json({
      id: row.id,
      staffId: row.staffId,
      clockInTime: row.clockInTime,
      clockOutTime: row.clockOutTime,
      shiftType: row.shiftType,
      location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
      date: row.date,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/staff/attendance/clock-out - Staff clock out
app.post('/api/staff/attendance/clock-out', (req, res) => {
  const { staffId, location } = req.body;

  if (!staffId) {
    return res.status(400).json({ error: 'staffId is required' });
  }

  try {
    // Find active attendance record
    const attendance = db.prepare(`
      SELECT * FROM staff_attendance 
      WHERE staffId = ? AND clockOutTime IS NULL 
      ORDER BY clockInTime DESC LIMIT 1
    `).get(staffId);

    if (!attendance) {
      return res.status(404).json({ error: 'No active clock-in found' });
    }

    const clockOutTime = new Date().toISOString();
    db.prepare('UPDATE staff_attendance SET clockOutTime = ? WHERE id = ?').run(clockOutTime, attendance.id);

    // Update staff status
    db.prepare("UPDATE staff SET status = 'offline' WHERE id = ?").run(staffId);

    const row = db.prepare('SELECT * FROM staff_attendance WHERE id = ?').get(attendance.id);
    res.json({
      id: row.id,
      staffId: row.staffId,
      clockInTime: row.clockInTime,
      clockOutTime: row.clockOutTime,
      shiftType: row.shiftType,
      location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
      date: row.date,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/staff/attendance/status/:staffId - Get current attendance status
app.get('/api/staff/attendance/status/:staffId', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT * FROM staff_attendance 
      WHERE staffId = ? AND clockOutTime IS NULL 
      ORDER BY clockInTime DESC LIMIT 1
    `).get(req.params.staffId);

    if (!row) {
      return res.json(null);
    }

    res.json({
      id: row.id,
      staffId: row.staffId,
      clockInTime: row.clockInTime,
      clockOutTime: row.clockOutTime,
      shiftType: row.shiftType,
      location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
      date: row.date,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ SOS Alerts API ============

// Helper to map SOS alert row to object
const sosAlertRowToObj = (row) => ({
  id: row.id,
  guardId: row.guardId,
  guardName: row.guardName,
  siteId: row.siteId,
  siteName: row.siteName,
  location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
  message: row.message,
  status: row.status,
  createdAt: row.createdAt,
  resolvedAt: row.resolvedAt,
  resolvedBy: row.resolvedBy,
  resolvedNotes: row.resolvedNotes,
});

// GET /api/sos-alerts - Get all SOS alerts (optionally filter by status)
app.get('/api/sos-alerts', (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM sos_alerts WHERE status = ? ORDER BY createdAt DESC').all(status);
    } else {
      rows = db.prepare('SELECT * FROM sos_alerts ORDER BY createdAt DESC').all();
    }
    res.json(rows.map(sosAlertRowToObj));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/sos-alerts/:id - Get a specific SOS alert
app.get('/api/sos-alerts/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM sos_alerts WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(sosAlertRowToObj(row));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/sos-alerts - Create a new SOS alert
app.post('/api/sos-alerts', (req, res) => {
  try {
    const { guardId, guardName, siteId, siteName, lat, lng, message } = req.body;
    const id = `sos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO sos_alerts (id, guardId, guardName, siteId, siteName, lat, lng, message, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(id, guardId, guardName, siteId, siteName, lat || null, lng || null, message || null, createdAt);

    // Also update the guard's status to 'alert'
    if (guardId) {
      db.prepare('UPDATE guards SET status = ? WHERE id = ?').run('alert', guardId);
    }

    res.status(201).json({
      id,
      guardId,
      guardName,
      siteId,
      siteName,
      location: (lat && lng) ? { lat, lng } : undefined,
      message,
      status: 'active',
      createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/sos-alerts/:id/resolve - Resolve an SOS alert
app.put('/api/sos-alerts/:id/resolve', (req, res) => {
  try {
    const { resolvedBy, resolvedNotes } = req.body;
    const resolvedAt = new Date().toISOString();

    // Get the alert first to get guardId
    const alert = db.prepare('SELECT * FROM sos_alerts WHERE id = ?').get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Not found' });

    db.prepare(`
      UPDATE sos_alerts 
      SET status = 'resolved', resolvedAt = ?, resolvedBy = ?, resolvedNotes = ?
      WHERE id = ?
    `).run(resolvedAt, resolvedBy || null, resolvedNotes || null, req.params.id);

    // Update guard status back to 'idle'
    if (alert.guardId) {
      db.prepare('UPDATE guards SET status = ? WHERE id = ?').run('idle', alert.guardId);
    }

    res.json({ ok: true, resolvedAt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/sos-alerts/:id - Delete an SOS alert
app.delete('/api/sos-alerts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sos_alerts WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ Guard Attendance API ============

// GET /api/attendance - Get guard attendance records with optional filters
app.get('/api/attendance', (req, res) => {
  try {
    const { from, to, siteId, guardId } = req.query;
    let query = 'SELECT * FROM guard_attendance WHERE 1=1';
    const params = [];

    if (from) {
      query += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND date <= ?';
      params.push(to);
    }
    if (siteId && siteId !== 'all') {
      query += ' AND siteId = ?';
      params.push(siteId);
    }
    if (guardId) {
      query += ' AND guardId = ?';
      params.push(guardId);
    }

    query += ' ORDER BY clockIn DESC';
    const rows = db.prepare(query).all(...params);
    
    res.json(rows.map(row => ({
      id: row.id,
      guardId: row.guardId,
      siteId: row.siteId,
      clockIn: row.clockIn,
      clockOut: row.clockOut,
      withinGeofence: !!row.withinGeofence,
      location: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : undefined,
      date: row.date,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/attendance/clock-in - Guard clock in
app.post('/api/attendance/clock-in', (req, res) => {
  try {
    const { guardId, siteId, lat, lng, withinGeofence } = req.body;
    const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const clockIn = new Date().toISOString();
    const date = clockIn.slice(0, 10);

    db.prepare(`
      INSERT INTO guard_attendance (id, guardId, siteId, clockIn, withinGeofence, lat, lng, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, guardId, siteId || null, clockIn, withinGeofence ? 1 : 0, lat || null, lng || null, date);

    // Update guard status
    db.prepare('UPDATE guards SET clockedIn = 1, clockInTime = ?, status = ? WHERE id = ?')
      .run(clockIn, 'online', guardId);

    res.status(201).json({ id, guardId, siteId, clockIn, withinGeofence: !!withinGeofence, date });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/attendance/clock-out - Guard clock out
app.post('/api/attendance/clock-out', (req, res) => {
  try {
    const { guardId } = req.body;
    const clockOut = new Date().toISOString();

    // Find active attendance record
    const attendance = db.prepare(`
      SELECT * FROM guard_attendance 
      WHERE guardId = ? AND clockOut IS NULL 
      ORDER BY clockIn DESC LIMIT 1
    `).get(guardId);

    if (!attendance) {
      return res.status(404).json({ error: 'No active clock-in found' });
    }

    db.prepare('UPDATE guard_attendance SET clockOut = ? WHERE id = ?').run(clockOut, attendance.id);
    
    // Update guard status
    db.prepare('UPDATE guards SET clockedIn = 0, status = ? WHERE id = ?').run('offline', guardId);

    res.json({ ...attendance, clockOut });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ System Config API ============

// GET /api/config - Get system configuration
app.get('/api/config', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM system_config WHERE id = ?').get('main');
    if (!row) {
      return res.json({
        usePremiumAPIs: false,
        faceRecognition: 'local',
        mapProvider: 'openstreetmap',
        locationUpdateInterval: 30,
        geofenceStrictness: 'medium',
        autoClockOut: true,
      });
    }
    res.json({
      usePremiumAPIs: !!row.usePremiumAPIs,
      faceRecognition: row.faceRecognition,
      mapProvider: row.mapProvider,
      locationUpdateInterval: row.locationUpdateInterval,
      geofenceStrictness: row.geofenceStrictness,
      autoClockOut: !!row.autoClockOut,
      updatedAt: row.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/config - Update system configuration
app.put('/api/config', (req, res) => {
  try {
    const { usePremiumAPIs, faceRecognition, mapProvider, locationUpdateInterval, geofenceStrictness, autoClockOut } = req.body;
    const updatedAt = new Date().toISOString();

    db.prepare(`
      UPDATE system_config 
      SET usePremiumAPIs = ?, faceRecognition = ?, mapProvider = ?, locationUpdateInterval = ?, geofenceStrictness = ?, autoClockOut = ?, updatedAt = ?
      WHERE id = 'main'
    `).run(
      usePremiumAPIs ? 1 : 0,
      faceRecognition || 'local',
      mapProvider || 'openstreetmap',
      locationUpdateInterval || 30,
      geofenceStrictness || 'medium',
      autoClockOut ? 1 : 0,
      updatedAt
    );

    res.json({ ok: true, updatedAt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ Support Tickets API ============

// GET /api/support-tickets - Get all support tickets
app.get('/api/support-tickets', (req, res) => {
  try {
    const { status } = req.query;
    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM support_tickets WHERE status = ? ORDER BY createdAt DESC').all(status);
    } else {
      rows = db.prepare('SELECT * FROM support_tickets ORDER BY createdAt DESC').all();
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/support-tickets - Create a support ticket
app.post('/api/support-tickets', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const id = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_tickets (id, name, email, subject, message, status, createdAt)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
    `).run(id, name, email, subject, message, createdAt);

    res.status(201).json({ id, name, email, subject, message, status: 'open', createdAt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/support-tickets/:id/resolve - Resolve a support ticket
app.put('/api/support-tickets/:id/resolve', (req, res) => {
  try {
    const { resolvedBy, response } = req.body;
    const resolvedAt = new Date().toISOString();

    db.prepare(`
      UPDATE support_tickets 
      SET status = 'resolved', resolvedAt = ?, resolvedBy = ?, response = ?
      WHERE id = ?
    `).run(resolvedAt, resolvedBy || null, response || null, req.params.id);

    res.json({ ok: true, resolvedAt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/support-tickets/:id - Delete a support ticket
app.delete('/api/support-tickets/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM support_tickets WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ Guard Notifications API ============

// GET /api/notifications/:guardId - Get notifications for a guard
app.get('/api/notifications/:guardId', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM guard_notifications 
      WHERE guardId = ? 
      ORDER BY createdAt DESC
      LIMIT 50
    `).all(req.params.guardId);
    
    res.json(rows.map(row => ({
      id: row.id,
      guardId: row.guardId,
      type: row.type,
      title: row.title,
      message: row.message,
      read: !!row.isRead,
      timestamp: row.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/notifications - Create a notification
app.post('/api/notifications', (req, res) => {
  try {
    const { guardId, type, title, message } = req.body;
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO guard_notifications (id, guardId, type, title, message, isRead, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(id, guardId, type || 'info', title, message, createdAt);

    res.status(201).json({ id, guardId, type, title, message, read: false, timestamp: createdAt });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE guard_notifications SET isRead = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/notifications/:guardId/read-all - Mark all notifications as read
app.put('/api/notifications/:guardId/read-all', (req, res) => {
  try {
    db.prepare('UPDATE guard_notifications SET isRead = 1 WHERE guardId = ?').run(req.params.guardId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ Guard Schedules API ============

// GET /api/schedules/:guardId - Get schedules for a guard
app.get('/api/schedules/:guardId', (req, res) => {
  try {
    const { from, to } = req.query;
    let query = 'SELECT * FROM guard_schedules WHERE guardId = ?';
    const params = [req.params.guardId];

    if (from) {
      query += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND date <= ?';
      params.push(to);
    }

    query += ' ORDER BY date ASC, startTime ASC';
    const rows = db.prepare(query).all(...params);
    
    res.json(rows.map(row => ({
      id: row.id,
      guardId: row.guardId,
      siteId: row.siteId,
      siteName: row.siteName,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      isNightShift: !!row.isNightShift,
      status: row.status,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/schedules - Create a schedule
app.post('/api/schedules', (req, res) => {
  try {
    const { guardId, siteId, siteName, date, startTime, endTime, isNightShift } = req.body;
    const id = `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO guard_schedules (id, guardId, siteId, siteName, date, startTime, endTime, isNightShift, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(id, guardId, siteId || null, siteName || null, date, startTime, endTime, isNightShift ? 1 : 0, createdAt);

    res.status(201).json({ id, guardId, siteId, siteName, date, startTime, endTime, isNightShift: !!isNightShift, status: 'scheduled' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/schedules/:id - Update a schedule
app.put('/api/schedules/:id', (req, res) => {
  try {
    const { siteId, siteName, date, startTime, endTime, isNightShift, status } = req.body;
    const existing = db.prepare('SELECT * FROM guard_schedules WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Schedule not found' });

    db.prepare(`
      UPDATE guard_schedules 
      SET siteId = ?, siteName = ?, date = ?, startTime = ?, endTime = ?, isNightShift = ?, status = ?
      WHERE id = ?
    `).run(
      siteId ?? existing.siteId,
      siteName ?? existing.siteName,
      date ?? existing.date,
      startTime ?? existing.startTime,
      endTime ?? existing.endTime,
      isNightShift !== undefined ? (isNightShift ? 1 : 0) : existing.isNightShift,
      status ?? existing.status,
      req.params.id
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/schedules/:id - Delete a schedule
app.delete('/api/schedules/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM guard_schedules WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ Patrol Logs API ============

// GET /api/patrol-logs/:guardId - Get patrol logs for a guard
app.get('/api/patrol-logs/:guardId', (req, res) => {
  try {
    const { date, shiftId } = req.query;
    let query = 'SELECT * FROM patrol_logs WHERE guardId = ?';
    const params = [req.params.guardId];

    if (date) {
      query += ' AND DATE(timestamp) = ?';
      params.push(date);
    }
    if (shiftId) {
      query += ' AND shiftId = ?';
      params.push(shiftId);
    }

    query += ' ORDER BY timestamp DESC';
    const rows = db.prepare(query).all(...params);
    
    res.json(rows.map(row => ({
      id: row.id,
      guardId: row.guardId,
      siteId: row.siteId,
      patrolPointId: row.patrolPointId,
      patrolPointName: row.patrolPointName,
      shiftId: row.shiftId,
      latitude: row.lat,
      longitude: row.lng,
      withinRadius: !!row.withinRadius,
      distanceFromPoint: row.distanceFromPoint,
      timestamp: row.timestamp,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/patrol-logs - Create a patrol log entry
app.post('/api/patrol-logs', (req, res) => {
  try {
    const { guardId, siteId, patrolPointId, patrolPointName, shiftId, lat, lng, withinRadius, distanceFromPoint } = req.body;
    const id = `pl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO patrol_logs (id, guardId, siteId, patrolPointId, patrolPointName, shiftId, lat, lng, withinRadius, distanceFromPoint, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, guardId, siteId || null, patrolPointId, patrolPointName, shiftId || null, lat || null, lng || null, withinRadius ? 1 : 0, distanceFromPoint || null, timestamp);

    res.status(201).json({ 
      id, guardId, siteId, patrolPointId, patrolPointName, shiftId, 
      latitude: lat, longitude: lng, withinRadius: !!withinRadius, 
      distanceFromPoint, timestamp 
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/patrol-logs/site/:siteId - Get patrol logs for a site
app.get('/api/patrol-logs/site/:siteId', (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM patrol_logs WHERE siteId = ?';
    const params = [req.params.siteId];

    if (date) {
      query += ' AND DATE(timestamp) = ?';
      params.push(date);
    }

    query += ' ORDER BY timestamp DESC LIMIT 100';
    const rows = db.prepare(query).all(...params);
    
    res.json(rows.map(row => ({
      id: row.id,
      guardId: row.guardId,
      siteId: row.siteId,
      patrolPointId: row.patrolPointId,
      patrolPointName: row.patrolPointName,
      shiftId: row.shiftId,
      latitude: row.lat,
      longitude: row.lng,
      withinRadius: !!row.withinRadius,
      distanceFromPoint: row.distanceFromPoint,
      timestamp: row.timestamp,
    })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ Dashboard Statistics API ============

// GET /api/stats/dashboard - Get platform dashboard stats
app.get('/api/stats/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Get all guards and attendance for today
    const guards = db.prepare('SELECT * FROM guards').all();
    const todayAttendance = db.prepare('SELECT * FROM guard_attendance WHERE date = ?').all(today);
    
    // Calculate average clock-in time
    let avgClockInTime = '--:--';
    if (todayAttendance.length > 0) {
      const clockInTimes = todayAttendance
        .filter(a => a.clockIn)
        .map(a => {
          const d = new Date(a.clockIn);
          return d.getHours() * 60 + d.getMinutes();
        });
      if (clockInTimes.length > 0) {
        const avgMinutes = Math.round(clockInTimes.reduce((a, b) => a + b, 0) / clockInTimes.length);
        const hours = Math.floor(avgMinutes / 60);
        const mins = avgMinutes % 60;
        avgClockInTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
    }
    
    // Calculate geofence compliance (% of clock-ins within geofence)
    let geofenceCompliance = 0;
    const attendanceWithGeofence = todayAttendance.filter(a => a.withinGeofence !== null);
    if (attendanceWithGeofence.length > 0) {
      const compliantCount = attendanceWithGeofence.filter(a => a.withinGeofence === 1).length;
      geofenceCompliance = Math.round((compliantCount / attendanceWithGeofence.length) * 100 * 10) / 10;
    }
    
    // Count guards who clocked in today
    const clockedInToday = todayAttendance.length;
    const totalGuards = guards.length;
    
    res.json({
      avgClockInTime,
      geofenceCompliance,
      clockedInToday,
      totalGuards,
      wakeUpResponseRate: 0, // Placeholder - would need wake alert logs table
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/stats/guard/:guardId - Get stats for a specific guard
app.get('/api/stats/guard/:guardId', (req, res) => {
  try {
    const guardId = req.params.guardId;
    
    // Count total shifts (attendance records)
    const totalShifts = db.prepare('SELECT COUNT(*) as count FROM guard_attendance WHERE guardId = ?').get(guardId);
    
    // Count days with clock-in in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttendance = db.prepare(`
      SELECT COUNT(DISTINCT date) as worked FROM guard_attendance 
      WHERE guardId = ? AND date >= ?
    `).get(guardId, thirtyDaysAgo.toISOString().slice(0, 10));
    
    // Calculate attendance rate (days worked / 30 days * 100)
    const daysWorked = recentAttendance?.worked || 0;
    // Assume 6 working days per week = ~26 expected days in 30 days
    const expectedDays = 26;
    const attendanceRate = expectedDays > 0 ? Math.min(100, Math.round((daysWorked / expectedDays) * 100)) : 0;
    
    // Get patrol completion count
    const patrolLogs = db.prepare('SELECT COUNT(*) as count FROM patrol_logs WHERE guardId = ?').get(guardId);
    
    res.json({
      shiftsCompleted: totalShifts?.count || 0,
      attendanceRate,
      patrolsCompleted: patrolLogs?.count || 0,
      daysWorkedLast30: daysWorked,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/guards/:id/location - Update guard's current location
app.put('/api/guards/:id/location', (req, res) => {
  try {
    const { lat, lng } = req.body;
    const guardId = req.params.id;
    
    // Update guard's location
    db.prepare(`
      UPDATE guards SET lat = ?, lng = ?, lastSeen = ? WHERE id = ?
    `).run(lat, lng, new Date().toISOString(), guardId);
    
    // Get the guard to append to location history
    const guard = db.prepare('SELECT * FROM guards WHERE id = ?').get(guardId);
    if (guard) {
      let history = [];
      try {
        history = guard.locationHistory ? JSON.parse(guard.locationHistory) : [];
      } catch (e) {}
      
      // Keep last 50 positions
      history.push({ lat, lng, timestamp: new Date().toISOString() });
      if (history.length > 50) history = history.slice(-50);
      
      db.prepare('UPDATE guards SET locationHistory = ? WHERE id = ?')
        .run(JSON.stringify(history), guardId);
    }
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ============ PAYROLL ENDPOINTS ============

// GET /api/payroll/:guardId - Get all payroll records for a guard
app.get('/api/payroll/:guardId', (req, res) => {
  try {
    const guardId = req.params.guardId;
    const records = db.prepare('SELECT * FROM payroll WHERE guardId = ? ORDER BY year DESC, month DESC').all(guardId);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/payroll/:guardId/:month/:year - Get specific month payroll for a guard
app.get('/api/payroll/:guardId/:month/:year', (req, res) => {
  try {
    const { guardId, month, year } = req.params;
    let record = db.prepare('SELECT * FROM payroll WHERE guardId = ? AND month = ? AND year = ?').get(guardId, parseInt(month), parseInt(year));
    
    // If no record exists, generate one based on attendance data
    if (!record) {
      const guard = db.prepare('SELECT * FROM guards WHERE id = ?').get(guardId);
      if (!guard) {
        return res.status(404).json({ error: 'Guard not found' });
      }
      
      // Get attendance records for this month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      const attendance = db.prepare(`
        SELECT COUNT(DISTINCT date) as daysWorked FROM guard_attendance 
        WHERE guardId = ? AND date >= ? AND date <= ?
      `).get(guardId, startDate, endDate);
      
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const totalDaysWorked = attendance?.daysWorked || 0;
      const dailyRate = guard.dailyRate || 800;
      const grossPay = totalDaysWorked * dailyRate;
      const pfDeduction = Math.round(grossPay * 0.12); // 12% PF
      const uniformDeduction = 0; // Can be set per guard
      const netPay = grossPay - pfDeduction - uniformDeduction;
      
      // Create the payroll record
      const id = `payroll-${guardId}-${month}-${year}`;
      db.prepare(`
        INSERT INTO payroll (id, guardId, guardName, month, year, totalDaysWorked, dailyRate, grossPay, uniformDeduction, pfDeduction, otherDeductions, netPay, status, generatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(id, guardId, guard.name, parseInt(month), parseInt(year), totalDaysWorked, dailyRate, grossPay, uniformDeduction, pfDeduction, 0, netPay, new Date().toISOString());
      
      record = db.prepare('SELECT * FROM payroll WHERE id = ?').get(id);
    }
    
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/payroll/:id - Update payroll record (finalize, mark as paid)
app.put('/api/payroll/:id', (req, res) => {
  try {
    const { status, uniformDeduction, otherDeductions } = req.body;
    const payrollId = req.params.id;
    
    const existing = db.prepare('SELECT * FROM payroll WHERE id = ?').get(payrollId);
    if (!existing) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    
    // Recalculate if deductions changed
    let netPay = existing.netPay;
    if (uniformDeduction !== undefined || otherDeductions !== undefined) {
      const newUniform = uniformDeduction !== undefined ? uniformDeduction : existing.uniformDeduction;
      const newOther = otherDeductions !== undefined ? otherDeductions : existing.otherDeductions;
      netPay = existing.grossPay - existing.pfDeduction - newUniform - newOther;
      
      db.prepare('UPDATE payroll SET uniformDeduction = ?, otherDeductions = ?, netPay = ? WHERE id = ?')
        .run(newUniform, newOther, netPay, payrollId);
    }
    
    // Update status
    if (status) {
      const now = new Date().toISOString();
      if (status === 'finalized') {
        db.prepare('UPDATE payroll SET status = ?, finalizedAt = ? WHERE id = ?').run(status, now, payrollId);
      } else if (status === 'paid') {
        db.prepare('UPDATE payroll SET status = ?, paidAt = ? WHERE id = ?').run(status, now, payrollId);
      } else {
        db.prepare('UPDATE payroll SET status = ? WHERE id = ?').run(status, payrollId);
      }
    }
    
    const updated = db.prepare('SELECT * FROM payroll WHERE id = ?').get(payrollId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/attendance - Get attendance records with optional filters
app.get('/api/attendance', (req, res) => {
  try {
    const { guardId, date, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM guard_attendance WHERE 1=1';
    const params = [];
    
    if (guardId) {
      query += ' AND guardId = ?';
      params.push(guardId);
    }
    
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    } else if (startDate && endDate) {
      query += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY date DESC, clockIn DESC';
    
    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`GuardSync local API running at http://localhost:${port}/api`));
