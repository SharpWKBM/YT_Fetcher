import 'dotenv/config';
import { getClient } from '../lib/db';
import { fetchChannelFull, fetchChannelsBatch } from '../lib/youtube/no-api';

async function main() {
  const c = getClient();
  const r = await c.execute({
    sql: "SELECT id FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24 ORDER BY subscribers DESC LIMIT 5",
    args: [],
  });
  const ids = r.rows.map((row: any) => row.id as string);
  console.log(`Testing ${ids.length} channels...\n`);

  for (const id of ids) {
    try {
      const data = await fetchChannelFull(id);
      console.log(`✓ ${id} | ${data.title} | subs=${data.subscribers} | videos=${data.videoCount} | country=${data.country} | joined=${data.joinedDate} | views=${data.viewCount} | last=${data.lastUploadDate} | links=${data.links.length} | recent=${data.recentVideos.length}`);
    } catch (e) {
      console.log(`✗ ${id} | ${(e as Error).message}`);
    }
  }

  console.log('\n--- Batch test (concurrency=3) ---');
  const t0 = Date.now();
  const batch = await fetchChannelsBatch(ids, { concurrency: 3, delayMs: 200 });
  const elapsed = Date.now() - t0;
  console.log(`Batch: ${batch.ok.length} ok, ${batch.notFound.length} not-found, ${batch.failed.length} failed in ${elapsed}ms`);
}

main().catch(e => { console.error(e); process.exit(1); });
