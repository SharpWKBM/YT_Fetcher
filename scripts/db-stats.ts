import 'dotenv/config';
import { getClient } from '../lib/db';

async function main() {
  const c = getClient();
  const total = (await c.execute('SELECT COUNT(*) as n FROM channels')).rows[0].n;
  const cols = ['language', 'region', 'last_upload_date', 'thumbnail_url', 'social_links', 'video_count', 'avg_views', 'engagement_rate', 'niche'];
  console.log(`Total channels: ${total}`);
  for (const col of cols) {
    const r = await c.execute(`SELECT COUNT(*) as n FROM channels WHERE ${col} IS NULL OR ${col} = ''`);
    console.log(`  ${col.padEnd(20)} NULL/empty: ${r.rows[0].n}`);
  }
  const idShape = await c.execute("SELECT SUBSTR(id, 1, 2) as p, COUNT(*) as n FROM channels GROUP BY p ORDER BY n DESC LIMIT 10");
  console.log('ID prefixes:'); for (const r of idShape.rows) console.log(`  ${r.p}: ${r.n}`);
}

main().catch(e => { console.error(e); process.exit(1); });
