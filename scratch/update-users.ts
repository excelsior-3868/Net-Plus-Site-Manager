import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function updateUsersTable() {
  try {
    console.log('Updating users table schema...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100) UNIQUE');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)');
    
    // Seed an admin user if none exists
    const adminExists = await pool.query("SELECT * FROM users WHERE employee_id = 'ADMIN001'");
    if (adminExists.rows.length === 0) {
      console.log('Seeding initial admin user (ADMIN001)...');
      await pool.query(`
        INSERT INTO users (uid, email, name, role, active, employee_id, password)
        VALUES ('admin-uid', 'admin@netplus.com', 'System Administrator', 'superadmin', true, 'ADMIN001', 'admin123')
      `);
    }
    
    console.log('Schema update successful.');
  } catch (err: any) {
    console.error('Schema update failed:', err.message);
  } finally {
    await pool.end();
  }
}

updateUsersTable();
