import { query } from '../server/db';

async function checkColumns() {
  try {
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sites'
      ORDER BY ordinal_position;
    `);
    console.log('Sites Table Columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    process.exit();
  }
}

checkColumns();
