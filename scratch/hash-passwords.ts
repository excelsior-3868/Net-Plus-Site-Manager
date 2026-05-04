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

async function migratePasswords() {
  try {
    console.log('Fetching all users...');
    const result = await pool.query('SELECT id, password FROM users');
    
    for (const user of result.rows) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        console.log(`Hashing password for user ID ${user.id}...`);
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
      } else {
        console.log(`User ID ${user.id} already has a hashed password.`);
      }
    }
    
    console.log('Password migration successful.');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migratePasswords();
