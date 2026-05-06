import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { validateEmail } from '@/lib/auth';
import { getUserByEmail, updateUserEmail } from '@/lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser && existingUser.id !== session.user.id) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    await updateUserEmail(session.user.id, email);

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully',
    });
  } catch (error) {
    console.error('Email update error:', error);
    return res.status(500).json({ error: 'Failed to update email' });
  }
}
