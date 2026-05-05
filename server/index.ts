import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to map snake_case to camelCase
const mapSite = (row: any) => ({
  id: row.id,
  siteId: row.site_id || '',
  name: row.name || '',
  admin: {
    province: row.province || '',
    zone: row.zone || '',
    district: row.district || '',
    localLevel: row.local_level || '',
  },
  status: row.status || 'Active',
  lat: parseFloat(row.lat) || 0,
  lng: parseFloat(row.lng) || 0,
  technologies: {
    type: (row.technologies || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    lteType: (row.lte_bands || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    lteRRUConfig: (row.lte_rru_config || '').split(',').map((s: string) => s.trim()).filter(Boolean),
  },
  tower: {
    height: row.tower_height || '',
    type: row.tower_type || '',
    owner: row.tower_owner || '',
    foundation: row.tower_foundation || '',
  },
  power: {
    source: (row.power_source || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    sourceType: row.power_source_type || '',
    backupDG: row.backup_dg || 'No',
    backupDGCapacity: row.dg_capacity || '',
    batteryType: row.battery_type || '',
    batteryCapacity: row.battery_capacity || '',
    batteryBanks: row.battery_banks || '',
    rectifierVendor: row.rectifier_vendor || '',
    rectifierCapacity: row.rectifier_capacity || '',
    solarCapacity: row.solar_capacity || '',
    batteryHealth: parseInt(row.battery_health) || 0,
    fuelLevel: parseInt(row.fuel_level) || 0,
    currentLoad: row.current_load || '',
  },
  transmission: {
    type: row.trans_type || 'Fiber',
    bandwidthCapacity: row.bandwidth || '',
    vendor: row.trans_vendor || '',
    path: row.trans_path || '',
    interface: row.trans_interface || '',
    indoorTransEquipmentType: row.indoor_trans_type || '',
    indoorTransEquipmentname: row.indoor_trans_name || '',
    indoorTransEquipmentVendor: row.indoor_trans_vendor || '',
    indoorTransEquipmentType2: row.indoor_trans_type_2 || '',
    indoorTransEquipmentname2: row.indoor_trans_name_2 || '',
    indoorTransEquipmentVendor2: row.indoor_trans_vendor_2 || '',
  },
  hubSite: row.hub_site || 'No',
  parentSite: row.parent_site || '',
  shelterType: row.shelter_type || 'Outdoor',
  owner: {
    name: row.owner_name || '',
    contact: row.owner_contact || '',
    type: row.owner_type || 'Internal',
    accessCode: row.access_code || '',
  },
  leaseContract: {
    Date: row.lease_date || '',
    renewalOnYears: row.renewal_years || '',
    renewalPercent: row.renewal_percent || '',
  },
  engineer: {
    name: row.engineer_name || '',
    phone: row.engineer_phone || '',
    employeeId: row.employee_id || '',
    shift: row.engineer_shift || '',
  },
  environment: {
    temp: parseFloat(row.temp) || 0,
    humidity: parseFloat(row.humidity) || 0,
    smokeDetector: !!row.smoke_detector,
    doorOpen: !!row.door_open,
  },
  alarms: (row.alarms || '').split(',').map((s: string) => s.trim()).filter(Boolean),
  lastAudit: row.last_audit || '',
  auditBy: row.audit_by || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by
});

const mapComplaint = (row: any) => ({
  id: row.id,
  ticketNumber: row.ticket_number,
  complaintName: row.complaint_name,
  complainerName: row.complainer_name,
  complainerContact: row.complainer_contact,
  province: row.province,
  zone: row.zone,
  district: row.district,
  localLevel: row.local_level,
  lat: parseFloat(row.lat),
  lng: parseFloat(row.lng),
  siteId: row.site_id,
  complaintType: row.complaint_type,
  status: row.status,
  comments: row.comments,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdByUserId: row.created_by_user_id,
  createdByUserName: row.created_by_user_name,
  updatedByUserId: row.updated_by_user_id,
  updatedByUserName: row.updated_by_user_name
});

// Auth API
app.post('/api/login', async (req, res) => {
  const { employeeId, password } = req.body;
  
  if (!employeeId || !password) {
    return res.status(400).json({ error: 'Employee ID and Password are required' });
  }

  try {
    const result = await query(
      'SELECT * FROM users WHERE employee_id = $1 AND active = true', 
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Employee ID or account inactive' });
    }

    const user = result.rows[0];
    
    // Use bcrypt to compare the provided password with the hashed password in the DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.json({
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      employeeId: user.employee_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Authentication service error' });
  }
});

// Sites API
app.get('/api/sites', async (req, res) => {
  console.log('Incoming GET /api/sites request');
  try {
    const result = await query('SELECT * FROM sites ORDER BY site_id ASC');
    res.json(result.rows.map(mapSite));
  } catch (err: any) {
    console.error('Database Error (GET /api/sites):', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sites/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Site not found' });
    res.json(mapSite(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/sites', async (req, res) => {
  const s = req.body;
  try {
    const result = await query(
      `INSERT INTO sites (
        site_id, name, status, province, zone, district, local_level, lat, lng,
        technologies, lte_bands, lte_rru_config, tower_height, tower_type, tower_owner, tower_foundation,
        power_source, power_source_type, backup_dg, dg_capacity, battery_type, battery_capacity, battery_banks,
        rectifier_vendor, rectifier_capacity, solar_capacity, battery_health, fuel_level, current_load,
        trans_type, bandwidth, trans_vendor, trans_path, trans_interface,
        indoor_trans_type, indoor_trans_name, indoor_trans_vendor,
        indoor_trans_type_2, indoor_trans_name_2, indoor_trans_vendor_2,
        hub_site, parent_site, shelter_type, owner_name, owner_contact, owner_type, access_code,
        lease_date, renewal_years, renewal_percent, engineer_name, engineer_phone, employee_id, engineer_shift,
        temp, humidity, smoke_detector, door_open, alarms, last_audit, audit_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
        $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62
      ) RETURNING id`,
      [
        s.siteId, s.name, s.status, s.admin?.province, s.admin?.zone, s.admin?.district, s.admin?.localLevel, s.lat, s.lng,
        s.technologies?.type?.join(', '), s.technologies?.lteType?.join(', '), s.technologies?.lteRRUConfig?.join(', '),
        s.tower?.height, s.tower?.type, s.tower?.owner, s.tower?.foundation,
        s.power?.source?.join(', '), s.power?.sourceType, s.power?.backupDG, s.power?.backupDGCapacity, s.power?.batteryType, s.power?.batteryCapacity, s.power?.batteryBanks,
        s.power?.rectifierVendor, s.power?.rectifierCapacity, s.power?.solarCapacity, s.power?.batteryHealth, s.power?.fuelLevel, s.power?.currentLoad,
        s.transmission?.type, s.transmission?.bandwidthCapacity, s.transmission?.vendor, s.transmission?.path, s.transmission?.interface,
        s.transmission?.indoorTransEquipmentType, s.transmission?.indoorTransEquipmentname, s.transmission?.indoorTransEquipmentVendor,
        s.transmission?.indoorTransEquipmentType2, s.transmission?.indoorTransEquipmentname2, s.transmission?.indoorTransEquipmentVendor2,
        s.hubSite, s.parentSite, s.shelterType, s.owner?.name, s.owner?.contact, s.owner?.type, s.owner?.accessCode,
        s.leaseContract?.Date, s.leaseContract?.renewalOnYears, s.leaseContract?.renewalPercent,
        s.engineer?.name, s.engineer?.phone, s.engineer?.employeeId, s.engineer?.shift,
        s.environment?.temp, s.environment?.humidity, s.environment?.smokeDetector, s.environment?.doorOpen,
        s.alarms?.join(', '), s.lastAudit, s.auditBy, s.updatedBy
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err: any) {
    console.error('Database Error (POST /api/sites):', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sites/:id', async (req, res) => {
  const s = req.body;
  try {
    await query(
      `UPDATE sites SET 
        site_id = $1, name = $2, status = $3, province = $4, zone = $5, district = $6, local_level = $7, lat = $8, lng = $9,
        technologies = $10, lte_bands = $11, lte_rru_config = $12, tower_height = $13, tower_type = $14, tower_owner = $15, tower_foundation = $16,
        power_source = $17, power_source_type = $18, backup_dg = $19, dg_capacity = $20, battery_type = $21, battery_capacity = $22, battery_banks = $23,
        rectifier_vendor = $24, rectifier_capacity = $25, solar_capacity = $26, battery_health = $27, fuel_level = $28, current_load = $29,
        trans_type = $30, bandwidth = $31, trans_vendor = $32, trans_path = $33, trans_interface = $34,
        indoor_trans_type = $35, indoor_trans_name = $36, indoor_trans_vendor = $37,
        indoor_trans_type_2 = $38, indoor_trans_name_2 = $39, indoor_trans_vendor_2 = $40,
        hub_site = $41, parent_site = $42, shelter_type = $43, owner_name = $44, owner_contact = $45, owner_type = $46, access_code = $47,
        lease_date = $48, renewal_years = $49, renewal_percent = $50, engineer_name = $51, engineer_phone = $52, employee_id = $53, engineer_shift = $54,
        temp = $55, humidity = $56, smoke_detector = $57, door_open = $58, alarms = $59, last_audit = $60, audit_by = $61, updated_by = $62,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $63`,
      [
        s.siteId, s.name, s.status, s.admin?.province, s.admin?.zone, s.admin?.district, s.admin?.localLevel, s.lat, s.lng,
        s.technologies?.type?.join(', '), s.technologies?.lteType?.join(', '), s.technologies?.lteRRUConfig?.join(', '),
        s.tower?.height, s.tower?.type, s.tower?.owner, s.tower?.foundation,
        s.power?.source?.join(', '), s.power?.sourceType, s.power?.backupDG, s.power?.backupDGCapacity, s.power?.batteryType, s.power?.batteryCapacity, s.power?.batteryBanks,
        s.power?.rectifierVendor, s.power?.rectifierCapacity, s.power?.solarCapacity, s.power?.batteryHealth, s.power?.fuelLevel, s.power?.currentLoad,
        s.transmission?.type, s.transmission?.bandwidthCapacity, s.transmission?.vendor, s.transmission?.path, s.transmission?.interface,
        s.transmission?.indoorTransEquipmentType, s.transmission?.indoorTransEquipmentname, s.transmission?.indoorTransEquipmentVendor,
        s.transmission?.indoorTransEquipmentType2, s.transmission?.indoorTransEquipmentname2, s.transmission?.indoorTransEquipmentVendor2,
        s.hubSite, s.parentSite, s.shelterType, s.owner?.name, s.owner?.contact, s.owner?.type, s.owner?.accessCode,
        s.leaseContract?.Date, s.leaseContract?.renewalOnYears, s.leaseContract?.renewalPercent,
        s.engineer?.name, s.engineer?.phone, s.engineer?.employeeId, s.engineer?.shift,
        s.environment?.temp, s.environment?.humidity, s.environment?.smokeDetector, s.environment?.doorOpen,
        s.alarms?.join(', '), s.lastAudit, s.auditBy, s.updatedBy, req.params.id
      ]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Database Error (PUT /api/sites):', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sites/:id', async (req, res) => {
  try {
    await query('DELETE FROM sites WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Complaints API
app.get('/api/complaints', async (req, res) => {
    try {
      const result = await query('SELECT * FROM complaints ORDER BY created_at DESC');
      res.json(result.rows.map(mapComplaint));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/complaints', async (req, res) => {
  const c = req.body;
  try {
    const result = await query(
      `INSERT INTO complaints (
        ticket_number, complaint_name, complainer_name, complainer_contact, 
        province, zone, district, local_level, lat, lng, site_id, complaint_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING id`,
      [
        c.ticketNumber, c.complaintName, c.complainerName, c.complainerContact,
        c.province, c.zone, c.district, c.localLevel, c.lat, c.lng, c.siteId, c.complaintType, c.status || 'Open'
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err: any) {
    console.error('Database Error (POST /api/complaints):', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/complaints/:id', async (req, res) => {
  const c = req.body;
  try {
    await query(
      `UPDATE complaints SET 
        status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [c.status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/complaints/:id', async (req, res) => {
  try {
    await query('DELETE FROM complaints WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/sites/:siteId/complaints', async (req, res) => {
  try {
    const result = await query('SELECT * FROM complaints WHERE site_id = $1 ORDER BY created_at DESC', [req.params.siteId]);
    res.json(result.rows.map(mapComplaint));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/users/:uid', async (req, res) => {
  const { role } = req.body;
  try {
    await query('UPDATE users SET role = $1 WHERE uid = $2', [role, req.params.uid]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/users/:uid', async (req, res) => {
  try {
    await query('DELETE FROM users WHERE uid = $1', [req.params.uid]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


// Catch-all to serve React Router routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
