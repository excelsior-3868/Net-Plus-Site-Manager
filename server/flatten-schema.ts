import { query } from './db';

async function flattenSchema() {
  try {
    console.log('Flattening database schema to match Excel columns...');
    
    // Drop existing table if it exists to start fresh with flat structure
    // WARNING: This will delete existing data. Assuming this is acceptable for dev sync.
    await query(`DROP TABLE IF EXISTS sites CASCADE;`);

    await query(`
      CREATE TABLE sites (
        id SERIAL PRIMARY KEY,
        site_id TEXT UNIQUE NOT NULL,
        name TEXT,
        status TEXT,
        province TEXT,
        zone TEXT,
        district TEXT,
        local_level TEXT,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        technologies TEXT, -- CSV or JSON string
        lte_bands TEXT,
        lte_rru_config TEXT,
        tower_height TEXT,
        tower_type TEXT,
        tower_owner TEXT,
        tower_foundation TEXT,
        power_source TEXT,
        power_source_type TEXT,
        backup_dg TEXT,
        dg_capacity TEXT,
        battery_type TEXT,
        battery_capacity TEXT,
        battery_banks TEXT,
        rectifier_vendor TEXT,
        rectifier_capacity TEXT,
        solar_capacity TEXT,
        battery_health INTEGER,
        fuel_level INTEGER,
        current_load TEXT,
        trans_type TEXT,
        bandwidth TEXT,
        trans_vendor TEXT,
        trans_path TEXT,
        trans_interface TEXT,
        indoor_trans_type TEXT,
        indoor_trans_name TEXT,
        indoor_trans_vendor TEXT,
        indoor_trans_type_2 TEXT,
        indoor_trans_name_2 TEXT,
        indoor_trans_vendor_2 TEXT,
        hub_site TEXT,
        parent_site TEXT,
        shelter_type TEXT,
        owner_name TEXT,
        owner_contact TEXT,
        owner_type TEXT,
        access_code TEXT,
        lease_date TEXT,
        renewal_years TEXT,
        renewal_percent TEXT,
        engineer_name TEXT,
        engineer_phone TEXT,
        employee_id TEXT,
        engineer_shift TEXT,
        temp DECIMAL(5, 2),
        humidity DECIMAL(5, 2),
        smoke_detector BOOLEAN,
        door_open BOOLEAN,
        alarms TEXT, -- CSV string
        last_audit TEXT,
        audit_by TEXT,
        updated_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Flat schema created successfully.');
  } catch (err) {
    console.error('Error flattening schema:', err);
  } finally {
    process.exit();
  }
}

flattenSchema();
