/**
 * One-shot helper: seed scripts/.backfill-checkpoint.json from the database
 * by finding the alphabetically-largest channel id whose fetched_at landed in
 * the last `--minutes` minutes (i.e. the ones the previous backfill run just
 * touched). Lets us pick up where the non-resumable run left off.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getClient } from '../lib/db';

const CHECKPOINT_PATH = path.join(__dirname, '.backfill-checkpoint.json');

async function main() {
  const argv = process.argv.slice(2);
  const minutesIdx = argv.indexOf('--minutes');
  const minutes = minutesIdx >= 0 && argv[minutesIdx + 1] ? parseInt(argv[minutesIdx + 1], 10) : 120;

  const c = getClient();
  const r = await c.execute({
    sql: `
      SELECT MAX(id) as last_id, COUNT(*) as touched
      FROM channels
      WHERE id LIKE 'UC%' AND LENGTH(id) = 24
        AND fetched_at >= datetime('now', '-' || ? || ' minutes')
    `,
    args: [minutes],
  });

  const lastId = r.rows[0].last_id as string | null;
  const touched = Number(r.rows[0].touched);
  if (!lastId) {
    console.log(`[Seed] No channels touched in the last ${minutes} minutes. Nothing to seed.`);
    return;
  }

  const cp = {
    lastId,
    processed: touched,
    totalOk: touched, // assume the previous run had ~100% success (it did in our tests)
    totalFailed: 0,
    startedAt: new Date(Date.now() - minutes * 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
  console.log(`[Seed] Wrote ${CHECKPOINT_PATH}`);
  console.log(cp);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
