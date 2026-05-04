import type { NextApiRequest, NextApiResponse } from 'next';
import { initDatabase, insertChannel } from '@/lib/db';
import { searchRussianChannels } from '@/lib/youtube';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialize database if needed
    await initDatabase();

    // Fetch more channels (increased from 50 to 200)
    const channels = await searchRussianChannels(200);

    // Store in database
    let inserted = 0;
    for (const channel of channels) {
      try {
        await insertChannel({
          id: channel.id,
          title: channel.title,
          subscribers: channel.subscribers,
          language: channel.language,
          region: channel.region,
          last_upload_date: channel.lastUploadDate,
          channel_url: channel.channelUrl,
          thumbnail_url: channel.thumbnailUrl,
        });
        inserted++;
      } catch (error) {
        console.error(`Failed to insert channel ${channel.id}:`, error);
      }
    }

    res.status(200).json({
      success: true,
      message: `Fetched and stored ${inserted} channels`,
      fetched: channels.length,
      inserted,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch and store channels',
    });
  }
}
