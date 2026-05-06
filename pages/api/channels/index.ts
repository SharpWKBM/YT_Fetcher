import type { NextApiRequest, NextApiResponse } from 'next';
import { getChannels } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      lastActivityRange,
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
      lastActivityRange: lastActivityRange as '1-3mo' | '3-6mo' | '6-12mo' | '12-24mo' | '24+mo' | undefined,
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
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
}
