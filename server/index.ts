import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { query } from './db';

dotenv.config();

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
  province: row.province,
  zone: row.zone,
  district: row.district,
  localLevel: row.local_level,
  status: row.status,
  lat: parseFloat(row.lat),
  lng: parseFloat(row.lng),
  technologies: row.technologies,
  tower: row.tower,
  power: row.power,
  transmission: row.transmission,
  hubSite: row.hub_site,
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

// Auth API (Mock for now)
app.post('/api/login', (req, res) => {
  // Simple mock login - in a real app, verify against DB
  const { email } = req.body;
  res.json({
    uid: 'admin-123',
    email: email || 'admin@netplus.com',
    name: 'System Administrator',
    role: 'admin',
    active: true
  });
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
        s.siteId, s.name, s.province, s.zone, s.district, s.localLevel, s.status || 'Active', s.lat, s.lng,
        s.technologies, s.tower, s.power, s.transmission, s.hubSite || false, s.parentSite,
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

// Complaints API
app.get('/api/complaints', async (req, res) => {
    try {
      const result = await query('SELECT * FROM complaints ORDER BY created_at DESC');
      res.json(result.rows);
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

// Catch-all to serve React Router routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
