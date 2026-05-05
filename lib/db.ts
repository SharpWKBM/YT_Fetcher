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

  // Initialize users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'enterprise')),
      channels_viewed_this_month INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_tier ON users(tier)`);

  // Initialize saved_searches table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      filters TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_saved_search_user ON saved_searches(user_id)`);

  // Initialize favorites table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      UNIQUE(user_id, channel_id)
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorites(user_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_favorite_channel ON favorites(channel_id)`);
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
    minSubs = 0,
    maxSubs = 10000000000,
    language,
    region,
    inactiveMonths = 0,
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

  // Build WHERE clause dynamically based on provided filters
  const whereClauses = [
    `subscribers >= ?`,
    `subscribers <= ?`,
  ];
  const args: any[] = [minSubs, maxSubs];

  if (language) {
    whereClauses.push(`(language = ? OR language IS NULL)`);
    args.push(language);
  }

  if (region) {
    whereClauses.push(`(region = ? OR region IS NULL)`);
    args.push(region);
  }

  if (inactiveMonths > 0) {
    whereClauses.push(`(last_upload_date IS NULL OR last_upload_date <= ?)`);
    args.push(inactiveDateStr);
  }

  const whereClause = whereClauses.join(' AND ');

  const result = await client.execute({
    sql: `
      SELECT * FROM channels
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `,
    args: [...args, limit, offset],
  });

  const countResult = await client.execute({
    sql: `
      SELECT COUNT(*) as total FROM channels
      WHERE ${whereClause}
    `,
    args: args,
  });

  return {
    channels: result.rows as unknown as Channel[],
    total: Number(countResult.rows[0].total),
    page,
    limit,
  };
}

// Saved Searches
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: string;
  created_at: string;
}

export async function createSavedSearch(userId: string, name: string, filters: ChannelFilters) {
  const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await client.execute({
    sql: `INSERT INTO saved_searches (id, user_id, name, filters) VALUES (?, ?, ?, ?)`,
    args: [id, userId, name, JSON.stringify(filters)],
  });
  return id;
}

export async function getSavedSearches(userId: string) {
  const result = await client.execute({
    sql: `SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as SavedSearch[];
}

export async function deleteSavedSearch(userId: string, searchId: string) {
  await client.execute({
    sql: `DELETE FROM saved_searches WHERE id = ? AND user_id = ?`,
    args: [searchId, userId],
  });
}

// Favorites
export interface Favorite {
  id: string;
  user_id: string;
  channel_id: string;
  created_at: string;
}

export async function addFavorite(userId: string, channelId: string) {
  const id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    await client.execute({
      sql: `INSERT INTO favorites (id, user_id, channel_id) VALUES (?, ?, ?)`,
      args: [id, userId, channelId],
    });
    return id;
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      throw new Error('Channel already in favorites');
    }
    throw error;
  }
}

export async function removeFavorite(userId: string, channelId: string) {
  await client.execute({
    sql: `DELETE FROM favorites WHERE user_id = ? AND channel_id = ?`,
    args: [userId, channelId],
  });
}

export async function getFavorites(userId: string) {
  const result = await client.execute({
    sql: `
      SELECT c.*, f.created_at as favorited_at
      FROM favorites f
      JOIN channels c ON f.channel_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `,
    args: [userId],
  });
  return result.rows as unknown as (Channel & { favorited_at: string })[];
}

export async function isFavorite(userId: string, channelId: string) {
  const result = await client.execute({
    sql: `SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND channel_id = ?`,
    args: [userId, channelId],
  });
  return Number(result.rows[0].count) > 0;
}
