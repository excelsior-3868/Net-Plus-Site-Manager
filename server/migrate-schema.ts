import { query } from './db';

async function updateSchema() {
  try {
    console.log('Updating database schema to match Excel file...');
    
    // Add audit_by column if it doesn't exist
    await query(`
      ALTER TABLE sites 
      ADD COLUMN IF NOT EXISTS audit_by TEXT;
    `);

    // Ensure all JSONB columns are present (they should be, but just in case)
    const jsonbCols = ['tower', 'power', 'transmission', 'owner_info', 'lease_contract', 'engineer_info', 'environment', 'technologies', 'alarms'];
    for (const col of jsonbCols) {
      await query(`
        ALTER TABLE sites 
        ADD COLUMN IF NOT EXISTS ${col} JSONB DEFAULT '{}';
      `);
    }

    console.log('Schema updated successfully.');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    process.exit();
  }
}

updateSchema();
