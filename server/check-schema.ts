import { query } from './db';

async function checkSchema() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'complaints';
    `);
    console.log('Columns in complaints table:', res.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    process.exit();
  }
}

checkSchema();
