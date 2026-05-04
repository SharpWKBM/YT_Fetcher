import { sql } from '@vercel/postgres';

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
  await sql`
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
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_subscribers ON channels(subscribers DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_last_upload ON channels(last_upload_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_language ON channels(language)`;
}

export async function insertChannel(channel: Omit<Channel, 'fetched_at'>) {
  await sql`
    INSERT INTO channels (id, title, subscribers, language, region, last_upload_date, channel_url, thumbnail_url)
    VALUES (${channel.id}, ${channel.title}, ${channel.subscribers}, ${channel.language}, ${channel.region}, ${channel.last_upload_date}, ${channel.channel_url}, ${channel.thumbnail_url})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      subscribers = EXCLUDED.subscribers,
      language = EXCLUDED.language,
      region = EXCLUDED.region,
      last_upload_date = EXCLUDED.last_upload_date,
      thumbnail_url = EXCLUDED.thumbnail_url,
      fetched_at = CURRENT_TIMESTAMP
  `;
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

  // Build ORDER BY clause safely
  const orderByClause = sortBy === 'subscribers'
    ? `subscribers ${order}`
    : `last_upload_date ${order}`;

  const query = `
    SELECT * FROM channels
    WHERE subscribers >= $1
      AND subscribers <= $2
      AND (language = $3 OR language IS NULL)
      AND (region = $4 OR region IS NULL)
      AND (last_upload_date IS NULL OR last_upload_date <= $5)
    ORDER BY ${orderByClause}
    LIMIT $6 OFFSET $7
  `;

  const result = await sql.query(query, [
    minSubs,
    maxSubs,
    language,
    region,
    inactiveDateStr,
    limit,
    offset,
  ]);

  const countQuery = `
    SELECT COUNT(*) as total FROM channels
    WHERE subscribers >= $1
      AND subscribers <= $2
      AND (language = $3 OR language IS NULL)
      AND (region = $4 OR region IS NULL)
      AND (last_upload_date IS NULL OR last_upload_date <= $5)
  `;

  const countResult = await sql.query(countQuery, [
    minSubs,
    maxSubs,
    language,
    region,
    inactiveDateStr,
  ]);

  return {
    channels: result.rows as Channel[],
    total: parseInt(countResult.rows[0].total as string),
    page,
    limit,
  };
}
