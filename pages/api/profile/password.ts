import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/auth/password-validator';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Validate new password strength
    const validation = validatePassword(new_password);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: validation.errors
      });
    }

    // Fetch user
    const result = await client.execute({
      sql: 'SELECT id, password FROM users WHERE email = ?',
      args: [session.user.email],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0] as any;

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    await client.execute({
      sql: 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [hashedPassword, user.id],
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}
