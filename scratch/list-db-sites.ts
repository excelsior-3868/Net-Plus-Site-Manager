import { query } from '../server/db';

async function listSites() {
  try {
    const result = await query('SELECT site_id, name FROM sites');
    console.log('Sites in DB:', result.rows.length);
    result.rows.forEach(row => {
      console.log(`- ${row.site_id}: ${row.name}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

listSites();
