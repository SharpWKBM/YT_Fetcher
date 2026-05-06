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
  tags?: string | null;
  niche?: string | null;
  social_links?: string | null;
  is_blacklisted?: number;
  blacklist_reason?: string | null;
  video_count?: number | null;
  avg_views?: number | null;
  engagement_rate?: number | null;
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
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
      social_links TEXT,
      video_count INTEGER,
      avg_views INTEGER,
      engagement_rate REAL,
      niche TEXT
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
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      avatar_url TEXT,
      bio TEXT,
      preferences TEXT,
      email_verified INTEGER DEFAULT 0,
      phone_number TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_secret TEXT,
      last_login_at TEXT,
      login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      password_hash TEXT,
      reset_token TEXT,
      reset_token_expires TEXT,
      is_admin INTEGER DEFAULT 0,
      subscription_status TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_current_period_end TEXT,
      trial_ends_at TEXT
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

  // Initialize channel_tags table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS channel_tags (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      UNIQUE(channel_id, tag)
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_tag_channel ON channel_tags(channel_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_tag_name ON channel_tags(tag)`);

  // Initialize channel_blacklist table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS channel_blacklist (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(channel_id, user_id)
    )
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_blacklist_user ON channel_blacklist(user_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_blacklist_channel ON channel_blacklist(channel_id)`);
}

export async function insertChannel(channel: Omit<Channel, 'fetched_at'>) {
  await client.execute({
    sql: `
      INSERT INTO channels (id, title, subscribers, language, region, last_upload_date, channel_url, thumbnail_url, social_links, video_count, avg_views, engagement_rate, niche)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        title = excluded.title,
        subscribers = excluded.subscribers,
        language = excluded.language,
        region = excluded.region,
        last_upload_date = excluded.last_upload_date,
        thumbnail_url = excluded.thumbnail_url,
        social_links = excluded.social_links,
        video_count = excluded.video_count,
        avg_views = excluded.avg_views,
        engagement_rate = excluded.engagement_rate,
        niche = excluded.niche,
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
      channel.social_links || null,
      channel.video_count || null,
      channel.avg_views || null,
      channel.engagement_rate || null,
      channel.niche || null,
    ],
  });
}

export interface ChannelFilters {
  minSubs?: number;
  maxSubs?: number;
  language?: string;
  region?: string;
  inactiveMonths?: number;
  sortBy?: 'subscribers' | 'last_upload_date' | 'niche' | 'tag_count';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  niche?: string;
  tags?: string[];
  minVideoCount?: number;
  maxVideoCount?: number;
  minEngagementRate?: number;
  hasSocialLinks?: boolean;
  excludeBlacklisted?: boolean;
  userId?: string;
  lastActivityRange?: '1-3mo' | '3-6mo' | '6-12mo' | '12-24mo' | '24+mo';
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
    lastActivityRange,
    userId,
    niche,
    tags,
  } = filters;

  const offset = (page - 1) * limit;
  const inactiveDate = new Date();
  inactiveDate.setMonth(inactiveDate.getMonth() - inactiveMonths);
  const inactiveDateStr = inactiveDate.toISOString().split('T')[0];

  let orderByClause = '';
  if (sortBy === 'subscribers') {
    orderByClause = `c.subscribers ${order}`;
  } else if (sortBy === 'last_upload_date') {
    orderByClause = `c.last_upload_date ${order}`;
  } else if (sortBy === 'niche') {
    orderByClause = `c.niche ${order}`;
  } else if (sortBy === 'tag_count') {
    orderByClause = `tag_count ${order}`;
  } else {
    orderByClause = `c.subscribers ${order}`;
  }

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

  // Handle lastActivityRange filter
  if (lastActivityRange) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (lastActivityRange) {
      case '1-3mo':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        endDate = new Date(now);
        endDate.setMonth(now.getMonth() - 1);
        whereClauses.push(`last_upload_date >= ? AND last_upload_date <= ?`);
        args.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
        break;
      case '3-6mo':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        endDate = new Date(now);
        endDate.setMonth(now.getMonth() - 3);
        whereClauses.push(`last_upload_date >= ? AND last_upload_date <= ?`);
        args.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
        break;
      case '6-12mo':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12);
        endDate = new Date(now);
        endDate.setMonth(now.getMonth() - 6);
        whereClauses.push(`last_upload_date >= ? AND last_upload_date <= ?`);
        args.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
        break;
      case '12-24mo':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 24);
        endDate = new Date(now);
        endDate.setMonth(now.getMonth() - 12);
        whereClauses.push(`last_upload_date >= ? AND last_upload_date <= ?`);
        args.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
        break;
      case '24+mo':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 24);
        whereClauses.push(`last_upload_date < ?`);
        args.push(startDate.toISOString().split('T')[0]);
        break;
    }
  }

  // Add niche filter
  if (niche) {
    whereClauses.push(`c.niche = ?`);
    args.push(niche);
  }

  const whereClause = whereClauses.join(' AND ');

  // Build FROM clause with blacklist join if userId provided
  let fromClause = 'channels c';
  let selectClause = 'c.*';
  let groupByClause = '';

  // Add tags join if tags filter provided
  if (tags && tags.length > 0) {
    fromClause += ' INNER JOIN channel_tags ct ON c.id = ct.channel_id';
    whereClauses.push(`ct.tag IN (${tags.map(() => '?').join(', ')})`);
    args.push(...tags);
    selectClause = 'c.*';
    groupByClause = ' GROUP BY c.id';
  }

  // Add tag count for sorting
  if (sortBy === 'tag_count') {
    if (!tags || tags.length === 0) {
      fromClause += ' LEFT JOIN channel_tags ct ON c.id = ct.channel_id';
    }
    selectClause = 'c.*, COUNT(ct.tag) as tag_count';
    groupByClause = ' GROUP BY c.id';
  }

  if (userId) {
    fromClause += ' LEFT JOIN channel_blacklist cb ON c.id = cb.channel_id AND cb.user_id = ?';
    args.push(userId);
    whereClauses.push('cb.id IS NULL');
  }

  const finalWhereClause = whereClauses.join(' AND ');

  const result = await client.execute({
    sql: `
      SELECT ${selectClause} FROM ${fromClause}
      WHERE ${finalWhereClause}
      ${groupByClause}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `,
    args: [...args, limit, offset],
  });

  const countResult = await client.execute({
    sql: `
      SELECT COUNT(DISTINCT c.id) as total FROM ${fromClause}
      WHERE ${finalWhereClause}
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

// Get single channel by ID
export async function getChannelById(channelId: string) {
  const result = await client.execute({
    sql: `SELECT * FROM channels WHERE id = ?`,
    args: [channelId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as Channel;
}

// Get related channels based on language, region, and subscriber range
export interface RelatedChannelsFilters {
  language?: string | null;
  region?: string | null;
  subscriberRange?: [number, number];
  limit?: number;
}

export async function getRelatedChannels(excludeChannelId: string, filters: RelatedChannelsFilters = {}) {
  const {
    language,
    region,
    subscriberRange,
    limit = 6,
  } = filters;

  const whereClauses: string[] = [`id != ?`];
  const args: any[] = [excludeChannelId];

  if (language) {
    whereClauses.push(`language = ?`);
    args.push(language);
  }

  if (region) {
    whereClauses.push(`region = ?`);
    args.push(region);
  }

  if (subscriberRange) {
    whereClauses.push(`subscribers >= ? AND subscribers <= ?`);
    args.push(subscriberRange[0], subscriberRange[1]);
  }

  const whereClause = whereClauses.join(' AND ');

  const result = await client.execute({
    sql: `
      SELECT * FROM channels
      WHERE ${whereClause}
      ORDER BY RANDOM()
      LIMIT ?
    `,
    args: [...args, limit],
  });

  return result.rows as unknown as Channel[];
}
