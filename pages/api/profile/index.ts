import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch user profile
      const result = await client.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [session.user.email],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0] as any;

      // Parse preferences
      let preferences = {
        email_notifications: true,
        theme: 'auto' as 'light' | 'dark' | 'auto',
        language: 'en',
      };

      if (user.preferences) {
        try {
          preferences = JSON.parse(user.preferences as string);
        } catch (e) {
          console.error('Failed to parse preferences:', e);
        }
      }

      const profile = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        subscription_tier: user.subscription_tier || 'free',
        subscription_status: user.subscription_status,
        two_factor_enabled: user.two_factor_enabled || 0,
        created_at: user.created_at,
        preferences,
      };

      return res.status(200).json({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, bio, email_notifications, theme, language } = req.body;

      // Build preferences object
      const preferences = JSON.stringify({
        email_notifications: email_notifications ?? true,
        theme: theme || 'auto',
        language: language || 'en',
      });

      // Update user profile
      await client.execute({
        sql: `UPDATE users
              SET name = ?, bio = ?, preferences = ?, updated_at = CURRENT_TIMESTAMP
              WHERE email = ?`,
        args: [name || null, bio || null, preferences, session.user.email],
      });

      return res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
