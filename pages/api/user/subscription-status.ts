import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getSubscriptionStatus } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await getSubscriptionStatus(session.user.id);

    return res.status(200).json(status);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
}
