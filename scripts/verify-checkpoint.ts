import 'dotenv/config';
import { getClient } from '../lib/db';
async function main() {
  const c = getClient();
  // How many channels are alphabetically AFTER UCznmHT5NowgdxNW6OY5kqAQ?
  const r1 = await c.execute({
    sql: `SELECT COUNT(*) as n FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24 AND id > ?`,
    args: ['UCznmHT5NowgdxNW6OY5kqAQ'],
  });
  // How many have NULL/empty enrichable fields after that lastId?
  const r2 = await c.execute({
    sql: `SELECT COUNT(*) as n FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24 AND id > ?
          AND (language IS NULL OR thumbnail_url IS NULL OR last_upload_date IS NULL)`,
    args: ['UCznmHT5NowgdxNW6OY5kqAQ'],
  });
  // How many have been touched in last 30 min specifically?
  const r3 = await c.execute({
    sql: `SELECT COUNT(*) as n FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24 AND fetched_at >= datetime('now', '-30 minutes')`,
  });
  // What % of the UC range has been "recently touched"?
  const r4 = await c.execute({
    sql: `SELECT
            SUM(CASE WHEN fetched_at >= datetime('now', '-4 hours') THEN 1 ELSE 0 END) as touched_recent,
            COUNT(*) as total,
            MAX(CASE WHEN fetched_at >= datetime('now', '-4 hours') THEN id END) as max_id,
            MIN(CASE WHEN fetched_at >= datetime('now', '-4 hours') THEN id END) as min_id
          FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24`,
  });
  console.log('After UCzn... cursor:');
  console.log(`  Channels remaining alphabetically: ${r1.rows[0].n}`);
  console.log(`  Of which still need enrichment:     ${r2.rows[0].n}`);
  console.log(`Touched in last 30 min: ${r3.rows[0].n}`);
  console.log(`Touched in last 4 hr:`, r4.rows[0]);
}
main();
