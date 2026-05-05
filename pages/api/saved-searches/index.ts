import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { createSavedSearch, getSavedSearches, deleteSavedSearch } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, {});

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.email;

  if (req.method === 'GET') {
    try {
      const searches = await getSavedSearches(userId);
      res.status(200).json({ searches });
    } catch (error) {
      console.error('[SavedSearches] Error fetching saved searches:', error);
      res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, filters } = req.body;

      if (!name || !filters) {
        return res.status(400).json({ error: 'Name and filters are required' });
      }

      const searchId = await createSavedSearch(userId, name, filters);
      res.status(201).json({ id: searchId, message: 'Search saved successfully' });
    } catch (error) {
      console.error('[SavedSearches] Error creating saved search:', error);
      res.status(500).json({ error: 'Failed to save search' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { searchId } = req.body;

      if (!searchId) {
        return res.status(400).json({ error: 'Search ID is required' });
      }

      await deleteSavedSearch(userId, searchId);
      res.status(200).json({ message: 'Search deleted successfully' });
    } catch (error) {
      console.error('[SavedSearches] Error deleting saved search:', error);
      res.status(500).json({ error: 'Failed to delete search' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
