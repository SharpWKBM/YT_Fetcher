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
  github?: string;
  patreon?: string;
  kofi?: string;
  linktree?: string;
  email?: string;
}

const SOCIAL_PATTERNS = {
  twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i,
  instagram: /instagram\.com\/([a-zA-Z0-9_.]+)/i,
  facebook: /facebook\.com\/([a-zA-Z0-9.]+)/i,
  tiktok: /tiktok\.com\/@?([a-zA-Z0-9_.]+)/i,
  discord: /discord\.gg\/([a-zA-Z0-9]+)/i,
  twitch: /twitch\.tv\/([a-zA-Z0-9_]+)/i,
  telegram: /t\.me\/([a-zA-Z0-9_]+)/i,
  linkedin: /linkedin\.com\/(?:in|company)\/([a-zA-Z0-9-]+)/i,
  github: /github\.com\/([a-zA-Z0-9_-]+)/i,
  patreon: /patreon\.com\/([a-zA-Z0-9_]+)/i,
  kofi: /ko-fi\.com\/([a-zA-Z0-9_]+)/i,
  linktree: /linktr\.ee\/([a-zA-Z0-9_.]+)/i,
};

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

export function extractSocialLinks(text: string): SocialLinks {
  const links: SocialLinks = {};

  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      links[platform as keyof SocialLinks] = match[0];
    }
  }

  // Extract email
  const emailMatches = text.match(EMAIL_PATTERN);
  if (emailMatches && emailMatches.length > 0) {
    links.email = emailMatches[0];
  }

  // Extract website (exclude known social platforms and YouTube)
  const websitePattern = /https?:\/\/(?!(?:twitter|instagram|facebook|tiktok|discord|twitch|telegram|linkedin|github|patreon|ko-fi|linktr|youtube|x)\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
  const websites = text.match(websitePattern);
  if (websites && websites.length > 0) {
    links.website = websites[0];
  }

  return links;
}

export async function fetchChannelAboutPage(channelId: string): Promise<string> {
  try {
    const aboutUrl = `https://www.youtube.com/channel/${channelId}/about`;
    const response = await fetch(aboutUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();

    // Extract description
    let text = '';
    const descriptionMatch = html.match(/"description":\{"simpleText":"([^"]+)"/);
    if (descriptionMatch) {
      text += descriptionMatch[1].replace(/\\n/g, '\n') + '\n';
    }

    // Extract links from the "Links" section
    const linksPattern = /"channelExternalLinkViewModel":\{[^}]*"title":\{"content":"[^"]*"\},"link":\{"content":"([^"]+)"\}/g;
    let linkMatch;
    while ((linkMatch = linksPattern.exec(html)) !== null) {
      text += linkMatch[1] + '\n';
    }

    // Extract email from contact info if present
    const emailMatch = html.match(/"businessEmail":\{"simpleText":"([^"]+)"/);
    if (emailMatch) {
      text += emailMatch[1] + '\n';
    }

    return text;
  } catch (error) {
    console.error(`Failed to fetch about page for ${channelId}:`, error);
    return '';
  }
}

export async function extractChannelSocialLinks(channelId: string): Promise<SocialLinks> {
  const aboutText = await fetchChannelAboutPage(channelId);
  return extractSocialLinks(aboutText);
}
