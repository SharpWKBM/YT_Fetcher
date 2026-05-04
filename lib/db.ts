import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export interface Channel {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  last_upload_date: string | null;
  channel_url: string;
  thumbnail_url: string | null;
  fetched_at: string;
}

export async function initDatabase() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subscribers INTEGER NOT NULL,
      language TEXT,
      region TEXT,
      last_upload_date TEXT,
      channel_url TEXT NOT NULL,
      thumbnail_url TEXT,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_subscribers ON channels(subscribers DESC)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_last_upload ON channels(last_upload_date)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_language ON channels(language)`);
}

export async function insertChannel(channel: Omit<Channel, 'fetched_at'>) {
  await client.execute({
    sql: `
      INSERT INTO channels (id, title, subscribers, language, region, last_upload_date, channel_url, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        title = excluded.title,
        subscribers = excluded.subscribers,
        language = excluded.language,
        region = excluded.region,
        last_upload_date = excluded.last_upload_date,
        thumbnail_url = excluded.thumbnail_url,
        fetched_at = CURRENT_TIMESTAMP
    `,
    args: [
      channel.id,
      channel.title,
      channel.subscribers,
      channel.language,
      channel.region,
      channel.last_upload_date,
      channel.channel_url,
      channel.thumbnail_url,
    ],
  });
}

export interface ChannelFilters {
  minSubs?: number;
  maxSubs?: number;
  language?: string;
  region?: string;
  inactiveMonths?: number;
  sortBy?: 'subscribers' | 'last_upload_date';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export async function getChannels(filters: ChannelFilters = {}) {
  const {
    minSubs = 10000,
    maxSubs = 10000000,
    language = 'ru',
    region = 'CIS',
    inactiveMonths = 6,
    sortBy = 'subscribers',
    order = 'DESC',
    page = 1,
    limit = 50,
  } = filters;

  const offset = (page - 1) * limit;
  const inactiveDate = new Date();
  inactiveDate.setMonth(inactiveDate.getMonth() - inactiveMonths);
  const inactiveDateStr = inactiveDate.toISOString().split('T')[0];

  const orderByClause = sortBy === 'subscribers'
    ? `subscribers ${order}`
    : `last_upload_date ${order}`;

  const result = await client.execute({
    sql: `
      SELECT * FROM channels
      WHERE subscribers >= ?
        AND subscribers <= ?
        AND (language = ? OR language IS NULL)
        AND (region = ? OR region IS NULL)
        AND (last_upload_date IS NULL OR last_upload_date <= ?)
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `,
    args: [minSubs, maxSubs, language, region, inactiveDateStr, limit, offset],
  });

  const countResult = await client.execute({
    sql: `
      SELECT COUNT(*) as total FROM channels
      WHERE subscribers >= ?
        AND subscribers <= ?
        AND (language = ? OR language IS NULL)
        AND (region = ? OR region IS NULL)
        AND (last_upload_date IS NULL OR last_upload_date <= ?)
    `,
    args: [minSubs, maxSubs, language, region, inactiveDateStr],
  });

  return {
    channels: result.rows as unknown as Channel[],
    total: Number(countResult.rows[0].total),
    page,
    limit,
  };
}
