import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function seedUser() {
  try {
    const employeeId = '6873';
    const password = 'Nimish@1234';
    const name = 'Nimish';
    const email = 'nimish@netplus.com';
    const uid = 'user-6873';
    
    console.log(`Seeding user ${employeeId}...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const exists = await pool.query('SELECT * FROM users WHERE employee_id = $1', [employeeId]);
    
    if (exists.rows.length > 0) {
      console.log('User already exists. Updating password...');
      await pool.query(
        'UPDATE users SET password = $1, name = $2 WHERE employee_id = $3',
        [hashedPassword, name, employeeId]
      );
    } else {
      await pool.query(`
        INSERT INTO users (uid, email, name, role, active, employee_id, password)
        VALUES ($1, $2, $3, 'admin', true, $4, $5)
      `, [uid, email, name, employeeId, hashedPassword]);
      console.log('User created successfully.');
    }
  } catch (err: any) {
    console.error('Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedUser();
