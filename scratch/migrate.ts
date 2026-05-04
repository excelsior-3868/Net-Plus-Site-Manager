import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Starting migration on:', process.env.DB_NAME);
    await pool.query(schema);
    console.log('Migration successful: All tables and indexes created.');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
