import 'dotenv/config';
import { getClient } from '../lib/db';
async function main() {
  const c = getClient();
  const r = await c.execute(`SELECT MIN(fetched_at) as min_at, MAX(fetched_at) as max_at,
    COUNT(CASE WHEN fetched_at IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN fetched_at < datetime('now', '-7 days') THEN 1 END) as old,
    COUNT(CASE WHEN fetched_at >= datetime('now', '-7 days') THEN 1 END) as recent,
    COUNT(*) as total FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24`);
  console.log(r.rows[0]);
}
main();
