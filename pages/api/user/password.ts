import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { hashPassword, validatePassword, verifyPassword } from '@/lib/auth';
import { getUserPasswordHash, updateUserPassword } from '@/lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const passwordHash = await getUserPasswordHash(session.user.id);
    if (!passwordHash) {
      return res.status(400).json({ error: 'No password set for this account' });
    }

    const isValid = await verifyPassword(currentPassword, passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await updateUserPassword(session.user.id, newPasswordHash);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
}
