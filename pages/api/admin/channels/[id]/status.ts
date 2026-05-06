import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { requireAdmin, logAdminAction } from '@/lib/admin';
import { updateChannelStatus } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const admin = await requireAdmin(req, res, session);

  if (!admin) {
    return;
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid channel ID' });
  }

  if (!['pending', 'approved', 'rejected', 'blacklisted'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await updateChannelStatus(id, status);

    await logAdminAction(
      admin.id,
      'UPDATE_CHANNEL_STATUS',
      'channel',
      id,
      { status },
      req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    );

    res.status(200).json({
      success: true,
      message: `Channel status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating channel status:', error);
    res.status(500).json({ error: 'Failed to update channel status' });
  }
}
