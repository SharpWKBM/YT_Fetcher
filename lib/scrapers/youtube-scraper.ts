import puppeteer, { Browser, Page } from 'puppeteer';

const REGION_CODES: Record<string, string> = {
  US: 'US',
  UK: 'GB',
  RU: 'RU',
  ES: 'ES',
  BR: 'BR',
  DE: 'DE',
  FR: 'FR',
  IN: 'IN',
  JP: 'JP',
};

// Helper function to wait
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ScrapedChannel {
  id: string;
  title: string;
}

interface ChannelDetails {
  subscribers: number;
  thumbnailUrl: string | null;
}

export async function scrapeChannelsByRegion(
  region: string,
  maxResults: number
): Promise<ScrapedChannel[]> {
  // Validate region
  if (!REGION_CODES[region]) {
    console.log(`Invalid region: ${region}`);
    return [];
  }

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set region-specific settings
    await page.setExtraHTTPHeaders({
      'Accept-Language': getLanguageForRegion(region),
    });

    // Use YouTube trending page to find popular channels
    const trendingUrl = `https://www.youtube.com/feed/trending?gl=${REGION_CODES[region]}`;
    await page.goto(trendingUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait a bit for dynamic content to load
    await delay(3000);

    // Extract channel data from video thumbnails
    const channels = await page.evaluate((max) => {
      const results: ScrapedChannel[] = [];
      const seenIds = new Set<string>();

      // Look for channel links in video renderers
      const videoElements = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer');

      for (const element of videoElements) {
        if (results.length >= max) break;

        // Find channel link
        const channelLink = element.querySelector('a.yt-simple-endpoint.style-scope.yt-formatted-string') as HTMLAnchorElement;
        if (!channelLink) continue;

        const href = channelLink.href;
        const channelIdMatch = href.match(/\/(channel|@)\/([^/?]+)/);
        if (!channelIdMatch) continue;

        const identifier = channelIdMatch[2];

        // Skip duplicates
        if (seenIds.has(identifier)) continue;
        seenIds.add(identifier);

        // Get channel name
        const channelName = channelLink.textContent?.trim() || '';

        results.push({
          id: identifier,
          title: channelName,
        });
      }

      return results;
    }, maxResults);

    // Resolve @handles to actual channel IDs
    const resolvedChannels: ScrapedChannel[] = [];
    for (const channel of channels) {
      if (channel.id.startsWith('UC')) {
        resolvedChannels.push(channel);
      } else {
        // Navigate to channel page to get actual ID
        try {
          const channelUrl = `https://www.youtube.com/@${channel.id}`;
          await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

          const actualId = await page.evaluate(() => {
            const linkElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
            if (!linkElement) return null;

            const match = linkElement.href.match(/\/channel\/([^/?]+)/);
            return match ? match[1] : null;
          });

          if (actualId) {
            resolvedChannels.push({
              id: actualId,
              title: channel.title,
            });
          }
        } catch (error) {
          console.error(`Failed to resolve channel ID for @${channel.id}:`, error);
        }
      }
    }

    return resolvedChannels;
  } catch (error) {
    console.error(`Error scraping channels for region ${region}:`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function scrapeChannelDetails(
  channelId: string
): Promise<ChannelDetails | null> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const channelUrl = `https://www.youtube.com/channel/${channelId}`;
    await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for content to load
    await delay(2000);

    // Extract subscriber count and thumbnail
    const details = await page.evaluate(() => {
      // Get subscriber count - try multiple selectors
      let subscribers = 0;

      // Try different possible selectors for subscriber count
      const subSelectors = [
        '#subscriber-count',
        'yt-formatted-string#subscriber-count',
        '[id="subscriber-count"]',
      ];

      for (const selector of subSelectors) {
        const subElement = document.querySelector(selector) as HTMLElement;
        if (subElement) {
          const subText = subElement.textContent?.trim() || '';
          // Parse formats like "150M subscribers", "1.5K subscribers", "150 million subscribers"
          const match = subText.match(/([\d.]+)\s*([KMB]|million|thousand)?/i);
          if (match) {
            const num = parseFloat(match[1]);
            const multiplier = match[2]?.toLowerCase();

            if (multiplier === 'k' || multiplier === 'thousand') subscribers = num * 1000;
            else if (multiplier === 'm' || multiplier === 'million') subscribers = num * 1000000;
            else if (multiplier === 'b') subscribers = num * 1000000000;
            else subscribers = num;

            break;
          }
        }
      }

      // Get thumbnail URL - try multiple selectors
      let thumbnailUrl: string | null = null;
      const imgSelectors = [
        'img#img',
        'yt-img-shadow img',
        'img.yt-core-image',
      ];

      for (const selector of imgSelectors) {
        const imgElement = document.querySelector(selector) as HTMLImageElement;
        if (imgElement?.src) {
          thumbnailUrl = imgElement.src;
          break;
        }
      }

      return {
        subscribers: Math.floor(subscribers),
        thumbnailUrl,
      };
    });

    return details;
  } catch (error) {
    console.error(`Error scraping details for channel ${channelId}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function getLanguageForRegion(region: string): string {
  const languageMap: Record<string, string> = {
    US: 'en-US',
    UK: 'en-GB',
    RU: 'ru-RU',
    ES: 'es-ES',
    BR: 'pt-BR',
    DE: 'de-DE',
    FR: 'fr-FR',
    IN: 'hi-IN',
    JP: 'ja-JP',
  };

  return languageMap[region] || 'en-US';
}
