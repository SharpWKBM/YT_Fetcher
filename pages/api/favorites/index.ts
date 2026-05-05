import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { addFavorite, removeFavorite, getFavorites, isFavorite } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, {});

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.email;

  if (req.method === 'GET') {
    try {
      const { channelId } = req.query;

      if (channelId && typeof channelId === 'string') {
        // Check if specific channel is favorited
        const favorited = await isFavorite(userId, channelId);
        res.status(200).json({ isFavorite: favorited });
      } else {
        // Get all favorites
        const favorites = await getFavorites(userId);
        res.status(200).json({ favorites });
      }
    } catch (error) {
      console.error('[Favorites] Error fetching favorites:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  } else if (req.method === 'POST') {
    try {
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: 'Channel ID is required' });
      }

      const favoriteId = await addFavorite(userId, channelId);
      res.status(201).json({ id: favoriteId, message: 'Channel added to favorites' });
    } catch (error: any) {
      if (error.message === 'Channel already in favorites') {
        return res.status(409).json({ error: error.message });
      }
      console.error('[Favorites] Error adding favorite:', error);
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: 'Channel ID is required' });
      }

      await removeFavorite(userId, channelId);
      res.status(200).json({ message: 'Channel removed from favorites' });
    } catch (error) {
      console.error('[Favorites] Error removing favorite:', error);
      res.status(500).json({ error: 'Failed to remove favorite' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
