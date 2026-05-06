import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { getClient } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const admin = await requireAdmin(req, res, session);

  if (!admin) {
    return;
  }

  const client = getClient();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await client.execute({
        sql: 'SELECT id, email, name, tier, channels_viewed_this_month, created_at, is_admin FROM users WHERE id = ?',
        args: [id as string],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await logAdminAction(
        admin.id,
        'VIEW_USER',
        'user',
        id as string,
        null,
        req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      );

      res.status(200).json({
        success: true,
        user: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { tier, name, email } = req.body;

      // Validate tier if provided
      if (tier && !['free', 'pro', 'enterprise'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier value' });
      }

      // Check if user exists
      const checkResult = await client.execute({
        sql: 'SELECT id, tier, name, email FROM users WHERE id = ?',
        args: [id as string],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const oldUser = checkResult.rows[0] as any;

      // Build update query dynamically
      const updates: string[] = [];
      const args: any[] = [];

      if (tier !== undefined) {
        updates.push('tier = ?');
        args.push(tier);
      }

      if (name !== undefined) {
        updates.push('name = ?');
        args.push(name);
      }

      if (email !== undefined) {
        updates.push('email = ?');
        args.push(email);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      args.push(id as string);

      await client.execute({
        sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });

      await logAdminAction(
        admin.id,
        'UPDATE_USER',
        'user',
        id as string,
        {
          old: { tier: oldUser.tier, name: oldUser.name, email: oldUser.email },
          new: { tier: tier || oldUser.tier, name: name || oldUser.name, email: email || oldUser.email },
        },
        req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
      );

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
