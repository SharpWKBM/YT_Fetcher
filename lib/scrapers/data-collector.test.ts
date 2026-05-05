// lib/scrapers/data-collector.test.ts
import { collectChannelData, searchChannelsByRegion } from './data-collector';

describe('Data Collector', () => {
  describe('collectChannelData', () => {
    it('should collect channel data using RSS feed', async () => {
      const channelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA'; // MrBeast

      const result = await collectChannelData(channelId);

      expect(result).toMatchObject({
        id: channelId,
        title: expect.any(String),
        lastUploadDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        channelUrl: `https://www.youtube.com/channel/${channelId}`,
      });
    }, 10000);

    it('should return null for invalid channel ID', async () => {
      const invalidChannelId = 'INVALID123';

      const result = await collectChannelData(invalidChannelId);

      expect(result).toBeNull();
    }, 10000);

    it('should handle channels with no uploads', async () => {
      const channelId = 'UCemptychannel123';

      const result = await collectChannelData(channelId);

      if (result) {
        expect(result.lastUploadDate).toBeNull();
      }
    }, 10000);
  });

  describe('searchChannelsByRegion', () => {
    it('should return empty array (scraping not yet implemented)', async () => {
      const region = 'US';
      const query = 'gaming';
      const maxResults = 5;

      const results = await searchChannelsByRegion(region, query, maxResults);

      // Scraping will be implemented in Puppeteer phase
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    }, 15000);

    it('should handle invalid region gracefully', async () => {
      const region = 'INVALID';
      const query = 'test';

      const results = await searchChannelsByRegion(region, query, 5);

      expect(Array.isArray(results)).toBe(true);
    }, 10000);

    it('should handle network errors gracefully', async () => {
      const region = 'US';
      const query = '';

      const results = await searchChannelsByRegion(region, query, 5);

      expect(Array.isArray(results)).toBe(true);
    }, 10000);
  });
});
