export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  discord?: string;
  twitch?: string;
  telegram?: string;
  linkedin?: string;
}

const SOCIAL_PATTERNS = {
  twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i,
  instagram: /instagram\.com\/([a-zA-Z0-9_.]+)/i,
  facebook: /facebook\.com\/([a-zA-Z0-9.]+)/i,
  tiktok: /tiktok\.com\/@([a-zA-Z0-9_.]+)/i,
  discord: /discord\.gg\/([a-zA-Z0-9]+)/i,
  twitch: /twitch\.tv\/([a-zA-Z0-9_]+)/i,
  telegram: /t\.me\/([a-zA-Z0-9_]+)/i,
  linkedin: /linkedin\.com\/(?:in|company)\/([a-zA-Z0-9-]+)/i,
};

export function extractSocialLinks(text: string): SocialLinks {
  const links: SocialLinks = {};

  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      links[platform as keyof SocialLinks] = match[0];
    }
  }

  const websitePattern = /https?:\/\/(?!(?:twitter|instagram|facebook|tiktok|discord|twitch|telegram|linkedin|youtube)\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
  const websites = text.match(websitePattern);
  if (websites && websites.length > 0) {
    links.website = websites[0];
  }

  return links;
}

export async function fetchChannelAboutPage(channelId: string): Promise<string> {
  try {
    const aboutUrl = `https://www.youtube.com/channel/${channelId}/about`;
    const response = await fetch(aboutUrl);

    if (!response.ok) {
      return '';
    }

    const html = await response.text();

    const descriptionMatch = html.match(/"description":\{"simpleText":"([^"]+)"/);
    if (descriptionMatch) {
      return descriptionMatch[1].replace(/\\n/g, '\n');
    }

    return '';
  } catch (error) {
    console.error(`Failed to fetch about page for ${channelId}:`, error);
    return '';
  }
}

export async function extractChannelSocialLinks(channelId: string): Promise<SocialLinks> {
  const aboutText = await fetchChannelAboutPage(channelId);
  return extractSocialLinks(aboutText);
}
