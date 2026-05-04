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

// Helper to map snake_case to camelCase
const mapSite = (row: any) => ({
  id: row.id,
  siteId: row.site_id,
  name: row.name,
  admin: {
    province: row.province,
    zone: row.zone,
    district: row.district,
    localLevel: row.local_level,
  },
  status: row.status,
  lat: parseFloat(row.lat),
  lng: parseFloat(row.lng),
  technologies: row.technologies,
  tower: row.tower,
  power: row.power,
  transmission: row.transmission,
  hubSite: row.hub_site ? 'Yes' : 'No',
  parentSite: row.parent_site,
  shelterType: row.shelter_type,
  owner: row.owner_info,
  leaseContract: row.lease_contract,
  engineer: row.engineer_info,
  environment: row.environment,
  alarms: row.alarms,
  lastAudit: row.last_audit,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by
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
  try {
    const result = await query('SELECT * FROM sites ORDER BY site_id ASC');
    res.json(result.rows.map(mapSite));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
        site_id, name, province, zone, district, local_level, status, lat, lng, 
        technologies, tower, power, transmission, hub_site, parent_site, 
        shelter_type, owner_info, lease_contract, engineer_info, environment, 
        alarms, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) 
      RETURNING id`,
      [
        s.siteId, s.name, s.admin?.province, s.admin?.zone, s.admin?.district, s.admin?.localLevel, s.status || 'Active', s.lat, s.lng,
        s.technologies, s.tower, s.power, s.transmission, s.hubSite === 'Yes', s.parentSite,
        s.shelterType, s.owner, s.leaseContract, s.engineer, s.environment,
        s.alarms, s.updatedBy
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/sites/:id', async (req, res) => {
  const s = req.body;
  try {
    await query(
      `UPDATE sites SET 
        site_id = $1, name = $2, province = $3, zone = $4, district = $5, local_level = $6, 
        status = $7, lat = $8, lng = $9, technologies = $10, tower = $11, power = $12, 
        transmission = $13, hub_site = $14, parent_site = $15, shelter_type = $16, 
        owner_info = $17, lease_contract = $18, engineer_info = $19, environment = $20, 
        alarms = $21, updated_by = $22, last_audit = $23, updated_at = CURRENT_TIMESTAMP
      WHERE id = $24`,
      [
        s.siteId, s.name, s.admin?.province, s.admin?.zone, s.admin?.district, s.admin?.localLevel, 
        s.status, s.lat, s.lng, s.technologies, s.tower, s.power, s.transmission, 
        s.hubSite === 'Yes', s.parentSite, s.shelterType, s.owner, s.leaseContract, 
        s.engineer, s.environment, s.alarms, s.updatedBy, s.lastAudit, req.params.id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
      res.json(result.rows.map(row => ({
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
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
    res.json(result.rows);
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
