import { query } from '../server/db';

async function checkMissingSites() {
  try {
    const result = await query('SELECT site_id, name, status, technologies FROM sites');
    result.rows.forEach(row => {
      const tech = typeof row.technologies === 'string' ? row.technologies : JSON.stringify(row.technologies);
      console.log(`Site ID: ${row.site_id}, Status: ${row.status}, Tech: ${tech}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkMissingSites();
