export const NICHES = [
  'Gaming',
  'Tech & Science',
  'Education',
  'Entertainment',
  'Music',
  'Sports & Fitness',
  'News & Politics',
  'Cooking & Food',
  'Travel & Adventure',
  'Fashion & Beauty',
  'Health & Wellness',
  'Finance & Business',
  'DIY & Crafts',
  'Vlog & Lifestyle',
  'Comedy',
  'Animation',
  'Film & TV',
  'Automotive',
  'Pets & Animals',
  'Kids & Family',
] as const;

export type Niche = typeof NICHES[number];

const NICHE_KEYWORDS: Record<Niche, string[]> = {
  'Gaming': ['game', 'gaming', 'gameplay', 'gamer', 'esports', 'minecraft', 'fortnite', 'valorant', 'league', 'dota', 'cs:go', 'pubg', 'cod', 'fifa', 'nba2k'],
  'Tech & Science': ['tech', 'technology', 'science', 'programming', 'coding', 'software', 'hardware', 'review', 'unboxing', 'gadget', 'phone', 'computer', 'ai', 'machine learning'],
  'Education': ['tutorial', 'learn', 'education', 'course', 'lesson', 'teach', 'study', 'school', 'university', 'math', 'physics', 'chemistry', 'biology', 'history'],
  'Entertainment': ['entertainment', 'fun', 'funny', 'challenge', 'prank', 'reaction', 'meme', 'viral', 'trending'],
  'Music': ['music', 'song', 'cover', 'remix', 'beat', 'instrumental', 'lyrics', 'album', 'concert', 'live', 'official', 'audio', 'mv'],
  'Sports & Fitness': ['sport', 'fitness', 'workout', 'gym', 'training', 'exercise', 'football', 'basketball', 'soccer', 'tennis', 'boxing', 'mma', 'yoga', 'running'],
  'News & Politics': ['news', 'politics', 'political', 'election', 'government', 'breaking', 'current', 'affairs', 'debate', 'analysis'],
  'Cooking & Food': ['cooking', 'recipe', 'food', 'chef', 'kitchen', 'baking', 'meal', 'dish', 'restaurant', 'cuisine', 'tasty', 'delicious'],
  'Travel & Adventure': ['travel', 'adventure', 'trip', 'tour', 'explore', 'destination', 'vacation', 'journey', 'backpack', 'vlog', 'world'],
  'Fashion & Beauty': ['fashion', 'beauty', 'makeup', 'style', 'outfit', 'haul', 'skincare', 'cosmetic', 'trend', 'lookbook', 'grwm'],
  'Health & Wellness': ['health', 'wellness', 'mental', 'meditation', 'mindfulness', 'therapy', 'self-care', 'healing', 'nutrition'],
  'Finance & Business': ['finance', 'business', 'money', 'invest', 'stock', 'crypto', 'trading', 'entrepreneur', 'startup', 'marketing', 'passive income'],
  'DIY & Crafts': ['diy', 'craft', 'handmade', 'creative', 'art', 'project', 'build', 'make', 'tutorial', 'how to'],
  'Vlog & Lifestyle': ['vlog', 'lifestyle', 'daily', 'routine', 'day in life', 'morning', 'night', 'family', 'personal'],
  'Comedy': ['comedy', 'funny', 'humor', 'laugh', 'joke', 'stand-up', 'sketch', 'parody', 'satire'],
  'Animation': ['animation', 'animated', 'cartoon', 'anime', 'manga', '2d', '3d', 'motion graphics'],
  'Film & TV': ['movie', 'film', 'cinema', 'tv', 'series', 'show', 'episode', 'trailer', 'review', 'recap'],
  'Automotive': ['car', 'auto', 'vehicle', 'drive', 'racing', 'motor', 'bike', 'motorcycle', 'truck', 'supercar'],
  'Pets & Animals': ['pet', 'animal', 'dog', 'cat', 'puppy', 'kitten', 'cute', 'wildlife', 'zoo', 'rescue'],
  'Kids & Family': ['kids', 'children', 'family', 'baby', 'toddler', 'parent', 'mom', 'dad', 'toy', 'nursery rhyme'],
};

export function classifyChannelNiche(
  title: string,
  description: string,
  tags: string[] = []
): Niche {
  const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  const scores: Record<Niche, number> = {} as Record<Niche, number>;

  for (const niche of NICHES) {
    let score = 0;
    const keywords = NICHE_KEYWORDS[niche];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    scores[niche] = score;
  }

  let maxScore = 0;
  let bestNiche: Niche = 'Entertainment';

  for (const [niche, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestNiche = niche as Niche;
    }
  }

  return bestNiche;
}

export function getNicheKeywords(niche: Niche): string[] {
  return NICHE_KEYWORDS[niche];
}
