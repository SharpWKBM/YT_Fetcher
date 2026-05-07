import 'dotenv/config';
import { getClient } from '../lib/db';
import { enrichChannelBatch, getChannelsNeedingEnrichment, getRemainingChannelsCount } from '../lib/enrichment';

async function main() {
  console.log('Remaining before:', await getRemainingChannelsCount());

  const channels = await getChannelsNeedingEnrichment(5);
  console.log(`Got ${channels.length} channels to enrich`);
  for (const c of channels) {
    console.log(`  ${c.id} | ${c.title} | lang=${c.language ?? 'NULL'} region=${c.region ?? 'NULL'} thumb=${c.thumbnail_url ? 'Y' : 'NULL'}`);
  }

  const stats = await enrichChannelBatch(channels);
  console.log('Stats:', stats);

  const ids = channels.map(c => c.id);
  if (ids.length > 0) {
    const c = getClient();
    const r = await c.execute({
      sql: `SELECT id, title, language, region, last_upload_date, thumbnail_url, social_links, video_count FROM channels WHERE id IN (${ids.map(() => '?').join(',')})`,
      args: ids,
    });
    console.log('\nAfter enrichment:');
    for (const row of r.rows) {
      console.log(`  ${row.id} | lang=${row.language} region=${row.region} last=${row.last_upload_date} thumb=${row.thumbnail_url ? 'Y' : 'N'} social=${row.social_links ? 'Y' : 'N'} vid=${row.video_count}`);
    }
  }

  console.log('\nRemaining after:', await getRemainingChannelsCount());
}

main().catch(e => { console.error(e); process.exit(1); });
