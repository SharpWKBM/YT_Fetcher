import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initDatabase,
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  insertChannel,
} from '../../lib/db';
import { getOrCreateUser } from '../../lib/users';

describe('Saved Searches', () => {
  const testUserId = 'test-user@example.com';
  const testFilters = {
    minSubs: 100000,
    maxSubs: 1000000,
    language: 'en',
    region: 'US',
  };

  beforeAll(async () => {
    await initDatabase();

    // Create test user
    await getOrCreateUser(testUserId, 'Test User');
  });

  it('should create a saved search', async () => {
    const searchId = await createSavedSearch(testUserId, 'Gaming Channels', testFilters);
    expect(searchId).toBeTruthy();
    expect(searchId).toMatch(/^search_/);
  });

  it('should retrieve saved searches for a user', async () => {
    await createSavedSearch(testUserId, 'Tech Channels', { minSubs: 50000, language: 'en' });
    const searches = await getSavedSearches(testUserId);

    expect(searches.length).toBeGreaterThanOrEqual(2);
    expect(searches[0]).toHaveProperty('id');
    expect(searches[0]).toHaveProperty('name');
    expect(searches[0]).toHaveProperty('filters');
    expect(searches[0]).toHaveProperty('created_at');
  });

  it('should parse filters as JSON', async () => {
    const searches = await getSavedSearches(testUserId);
    const search = searches.find(s => s.name === 'Gaming Channels');

    expect(search).toBeTruthy();
    const parsedFilters = JSON.parse(search!.filters);
    expect(parsedFilters.minSubs).toBe(100000);
    expect(parsedFilters.language).toBe('en');
  });

  it('should delete a saved search', async () => {
    const searchId = await createSavedSearch(testUserId, 'Temp Search', { minSubs: 1000 });
    await deleteSavedSearch(testUserId, searchId);

    const searches = await getSavedSearches(testUserId);
    const deletedSearch = searches.find(s => s.id === searchId);
    expect(deletedSearch).toBeUndefined();
  });

  it('should not delete another user\'s search', async () => {
    const searchId = await createSavedSearch(testUserId, 'My Search', { minSubs: 5000 });
    await deleteSavedSearch('other-user@example.com', searchId);

    const searches = await getSavedSearches(testUserId);
    const search = searches.find(s => s.id === searchId);
    expect(search).toBeTruthy();
  });
});

describe('Favorites', () => {
  const testUserId = 'test-user@example.com';
  const testChannelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA';
  const testChannelId2 = 'UCsXVk37bltHxD1rDPwtNM8Q';

  beforeAll(async () => {
    await initDatabase();

    // Create test users
    await getOrCreateUser(testUserId, testUserId, 'Test User');
    await getOrCreateUser('other-user@example.com', 'Other User');

    // Insert test channels
    await insertChannel({
      id: testChannelId,
      title: 'Test Channel 1',
      subscribers: 500000,
      language: 'en',
      region: 'US',
      last_upload_date: '2026-05-01',
      channel_url: `https://youtube.com/channel/${testChannelId}`,
      thumbnail_url: null,
    });

    await insertChannel({
      id: testChannelId2,
      title: 'Test Channel 2',
      subscribers: 250000,
      language: 'en',
      region: 'UK',
      last_upload_date: '2026-04-28',
      channel_url: `https://youtube.com/channel/${testChannelId2}`,
      thumbnail_url: null,
    });
  });

  it('should add a channel to favorites', async () => {
    const favoriteId = await addFavorite(testUserId, testChannelId);
    expect(favoriteId).toBeTruthy();
    expect(favoriteId).toMatch(/^fav_/);
  });

  it('should check if a channel is favorited', async () => {
    const isFav = await isFavorite(testUserId, testChannelId);
    expect(isFav).toBe(true);

    const isNotFav = await isFavorite(testUserId, 'non-existent-channel');
    expect(isNotFav).toBe(false);
  });

  it('should not allow duplicate favorites', async () => {
    await expect(addFavorite(testUserId, testChannelId)).rejects.toThrow('Channel already in favorites');
  });

  it('should retrieve all favorites for a user', async () => {
    await addFavorite(testUserId, testChannelId2);
    const favorites = await getFavorites(testUserId);

    expect(favorites.length).toBeGreaterThanOrEqual(2);
    expect(favorites[0]).toHaveProperty('id');
    expect(favorites[0]).toHaveProperty('title');
    expect(favorites[0]).toHaveProperty('subscribers');
    expect(favorites[0]).toHaveProperty('favorited_at');
  });

  it('should remove a channel from favorites', async () => {
    await removeFavorite(testUserId, testChannelId);
    const isFav = await isFavorite(testUserId, testChannelId);
    expect(isFav).toBe(false);
  });

  it('should not affect other users\' favorites', async () => {
    const otherUserId = 'other-user@example.com';
    await addFavorite(otherUserId, testChannelId);

    await removeFavorite(testUserId, testChannelId);

    const otherUserFav = await isFavorite(otherUserId, testChannelId);
    expect(otherUserFav).toBe(true);
  });

  it('should return favorites ordered by most recent first', async () => {
    const favorites = await getFavorites(testUserId);

    if (favorites.length >= 2) {
      const firstDate = new Date(favorites[0].favorited_at);
      const secondDate = new Date(favorites[1].favorited_at);
      expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
    }
  });
});
