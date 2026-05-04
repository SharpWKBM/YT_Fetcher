import type { NextApiRequest, NextApiResponse } from 'next';
import { getChannels } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getOrCreateUser, incrementChannelsViewed, getChannelsViewedThisMonth, canViewMoreChannels, TIER_LIMITS } from '@/lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    let userTier: 'free' | 'pro' | 'enterprise' = 'free';
    let channelsViewedThisMonth = 0;
    let canView = true;

    // If user is authenticated, check their tier and usage
    if (session?.user) {
      const user = await getOrCreateUser(
        session.user.id,
        session.user.email!,
        session.user.name || null
      );

      userTier = user.tier;
      channelsViewedThisMonth = await getChannelsViewedThisMonth(session.user.id);
      canView = canViewMoreChannels(userTier, channelsViewedThisMonth);

      // Increment view count if they can view
      if (canView) {
        await incrementChannelsViewed(session.user.id);
        channelsViewedThisMonth += 1;
      }
    }

    const {
      minSubs,
      maxSubs,
      language,
      region,
      inactiveMonths,
      sortBy,
      order,
      page,
      limit,
    } = req.query;

    const filters = {
      minSubs: minSubs ? parseInt(minSubs as string) : undefined,
      maxSubs: maxSubs ? parseInt(maxSubs as string) : undefined,
      language: language as string,
      region: region as string,
      inactiveMonths: inactiveMonths ? parseInt(inactiveMonths as string) : undefined,
      sortBy: sortBy as 'subscribers' | 'last_upload_date',
      order: order as 'ASC' | 'DESC',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const result = await getChannels(filters);

    const channelsWithInactivity = result.channels.map(channel => {
      let monthsInactive = null;
      if (channel.last_upload_date) {
        const lastUpload = new Date(channel.last_upload_date);
        const now = new Date();
        const diffMonths = (now.getFullYear() - lastUpload.getFullYear()) * 12 +
                          (now.getMonth() - lastUpload.getMonth());
        monthsInactive = diffMonths;
      }

      return {
        ...channel,
        monthsInactive,
      };
    });

    res.status(200).json({
      success: true,
      data: channelsWithInactivity,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
      userTier,
      channelsViewedThisMonth,
      tierLimit: TIER_LIMITS[userTier],
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
}
