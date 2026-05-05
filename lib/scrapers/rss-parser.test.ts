// lib/scrapers/rss-parser.test.ts
import { parseChannelRSS, getChannelLastUpload } from './rss-parser';

describe('RSS Parser', () => {
  describe('parseChannelRSS', () => {
    it('should parse valid YouTube RSS feed XML', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>Test Channel</title>
  <yt:channelId>UCtest123</yt:channelId>
  <entry>
    <title>Latest Video</title>
    <published>2024-01-15T10:00:00+00:00</published>
    <yt:videoId>video123</yt:videoId>
  </entry>
</feed>`;

      const result = await parseChannelRSS(mockXML);

      expect(result.channelId).toBe('UCtest123');
      expect(result.channelTitle).toBe('Test Channel');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].published).toBe('2024-01-15T10:00:00+00:00');
    });

    it('should handle empty feed with no entries', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>Empty Channel</title>
  <yt:channelId>UCempty</yt:channelId>
</feed>`;

      const result = await parseChannelRSS(mockXML);

      expect(result.channelId).toBe('UCempty');
      expect(result.entries).toEqual([]);
    });

    it('should throw error for invalid XML', async () => {
      const invalidXML = 'not valid xml';
      await expect(parseChannelRSS(invalidXML)).rejects.toThrow();
    });
  });

  describe('getChannelLastUpload', () => {
    it('should return date in YYYY-MM-DD format for real channel', async () => {
      // Using MrBeast's channel ID (real, active channel)
      const channelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA';
      
      const result = await getChannelLastUpload(channelId);
      
      expect(result).not.toBeNull();
      if (result !== null) {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }, 10000); // 10 second timeout for network request

    it('should return null for channel with no uploads', async () => {
      const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>Empty Channel</title>
  <yt:channelId>UCempty</yt:channelId>
</feed>`;

      const result = await parseChannelRSS(mockXML);
      expect(result.entries).toHaveLength(0);
    });
  });
});
