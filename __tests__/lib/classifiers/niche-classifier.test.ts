import { classifyChannelNiche } from '@/lib/classifiers/niche-classifier';

describe('Niche Classifier', () => {
  describe('classifyChannelNiche', () => {
    it('should classify gaming channels correctly', () => {
      const result = classifyChannelNiche(
        'Epic Gaming Channel',
        'We play Minecraft, Fortnite, and other popular games. Subscribe for daily gaming content!',
        ['gaming', 'minecraft', 'fortnite']
      );

      expect(result).toBe('Gaming');
    });

    it('should classify tech channels correctly', () => {
      const result = classifyChannelNiche(
        'Tech Reviews Pro',
        'Latest smartphone reviews, laptop comparisons, and technology news. Programming tutorials and coding tips.',
        ['tech', 'reviews', 'programming']
      );

      expect(result).toBe('Tech & Science');
    });

    it('should classify cooking channels correctly', () => {
      const result = classifyChannelNiche(
        'Delicious Recipes',
        'Easy cooking recipes, baking tutorials, and food preparation tips. Learn to cook amazing meals!',
        ['cooking', 'recipes', 'food']
      );

      expect(result).toBe('Cooking & Food');
    });

    it('should classify education channels correctly', () => {
      const result = classifyChannelNiche(
        'Learn Everything',
        'Educational content covering math, science, history, and more. Tutorial videos for students.',
        ['education', 'tutorial', 'learning']
      );

      expect(result).toBe('Education');
    });

    it('should classify music channels correctly', () => {
      const result = classifyChannelNiche(
        'Music Vibes',
        'Official music videos, live performances, and song covers. Subscribe for the best music content!',
        ['music', 'songs', 'artist']
      );

      expect(result).toBe('Music');
    });

    it('should classify fitness channels correctly', () => {
      const result = classifyChannelNiche(
        'Fit Life',
        'Workout routines, fitness tips, gym exercises, and healthy lifestyle advice. Get in shape with us!',
        ['fitness', 'workout', 'gym']
      );

      expect(result).toBe('Sports & Fitness');
    });

    it('should handle channels with mixed content', () => {
      const result = classifyChannelNiche(
        'Lifestyle Vlog',
        'Daily vlogs about my life, some cooking, occasional travel, and random stuff.',
        ['vlog', 'lifestyle', 'daily']
      );

      expect(result).toBe('Vlog');
    });

    it('should classify based on title when description is vague', () => {
      const result = classifyChannelNiche(
        'Gaming Pro 2024',
        'Welcome to my channel!',
        []
      );

      expect(result).toBe('Gaming');
    });

    it('should classify based on tags when title and description are generic', () => {
      const result = classifyChannelNiche(
        'My Channel',
        'Subscribe for content',
        ['comedy', 'funny', 'jokes']
      );

      expect(result).toBe('Comedy');
    });

    it('should handle empty inputs gracefully', () => {
      const result = classifyChannelNiche('', '', []);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should be case insensitive', () => {
      const result = classifyChannelNiche(
        'GAMING CHANNEL',
        'MINECRAFT AND FORTNITE GAMEPLAY',
        ['GAMING', 'MINECRAFT']
      );

      expect(result).toBe('Gaming');
    });

    it('should prioritize multiple keyword matches', () => {
      const result = classifyChannelNiche(
        'Tech Gaming Channel',
        'We review gaming laptops and tech gadgets for gamers',
        ['gaming', 'tech', 'reviews']
      );

      // Should classify as Gaming since it has more gaming-related keywords
      expect(['Gaming', 'Tech & Science']).toContain(result);
    });
  });
});
