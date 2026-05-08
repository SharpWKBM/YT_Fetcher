import { scrapeChannelsByRegion, scrapeChannelDetails } from './youtube-scraper';

describe('YouTube Scraper', () => {
  // Increase timeout for browser operations
  jest.setTimeout(30000);

  describe('scrapeChannelsByRegion', () => {
    it('should scrape channels from US region', async () => {
      const channels = await scrapeChannelsByRegion('US', 5);

      expect(channels).toBeDefined();
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThan(0);
      expect(channels.length).toBeLessThanOrEqual(5);

      // Verify channel structure
      const firstChannel = channels[0];
      expect(firstChannel).toHaveProperty('id');
      expect(firstChannel).toHaveProperty('title');
      expect(firstChannel.id).toMatch(/^UC[a-zA-Z0-9_-]{22}$/); // YouTube channel ID format
      expect(typeof firstChannel.title).toBe('string');
      expect(firstChannel.title.length).toBeGreaterThan(0);
    });

    it('should scrape channels from RU region', async () => {
      const channels = await scrapeChannelsByRegion('RU', 3);

      expect(channels).toBeDefined();
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThan(0);
      expect(channels.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for invalid region', async () => {
      const channels = await scrapeChannelsByRegion('INVALID', 5);

      expect(channels).toBeDefined();
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBe(0);
    });

    it('should respect maxResults parameter', async () => {
      const channels = await scrapeChannelsByRegion('US', 2);

      expect(channels.length).toBeLessThanOrEqual(2);
    });
  });

  describe('scrapeChannelDetails', () => {
    it('should scrape subscriber count from channel page', async () => {
      const channelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA'; // MrBeast
      const details = await scrapeChannelDetails(channelId);

      expect(details).not.toBeNull();
      if (!details) return;
      expect(details.subscribers).toBeGreaterThan(0);
      expect(typeof details.subscribers).toBe('number');
    });

    it('should extract thumbnail URL', async () => {
      const channelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA'; // MrBeast
      const details = await scrapeChannelDetails(channelId);

      expect(details).not.toBeNull();
      if (!details) return;
      expect(details.thumbnailUrl).toBeDefined();
      expect(typeof details.thumbnailUrl).toBe('string');
      expect(details.thumbnailUrl).toMatch(/^https?:\/\//);
    });

    it('should return null for invalid channel ID', async () => {
      const details = await scrapeChannelDetails('INVALID_ID');

      expect(details).toBeNull();
    });
  });
});
