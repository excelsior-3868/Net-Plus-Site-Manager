import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing connection with:');
console.log('User:', process.env.DB_USER);
console.log('Host:', process.env.DB_HOST);
console.log('DB:', process.env.DB_NAME);
console.log('Pass Length:', process.env.DB_PASSWORD?.length);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection failed:', err.message);
  } else {
    console.log('Connection successful:', res.rows[0]);
  }
  pool.end();
});
