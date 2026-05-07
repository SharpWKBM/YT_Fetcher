import 'dotenv/config';
import { getClient } from '../lib/db';

async function checkChannelIds() {
  const client = getClient();

  const result = await client.execute({
    sql: 'SELECT id, title, channel_url FROM channels WHERE language IS NULL LIMIT 20',
    args: [],
  });

  console.log('Sample channels needing enrichment:\n');
  result.rows.forEach((row: any) => {
    console.log(`ID: ${row.id}`);
    console.log(`Title: ${row.title}`);
    console.log(`URL: ${row.channel_url}`);
    console.log('---');
  });
}

checkChannelIds().catch(console.error);
