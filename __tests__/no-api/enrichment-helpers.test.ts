import { describe, it, expect } from '@jest/globals';
import {
  detectLanguageFromText,
  extractSocialLinks,
} from '../../lib/enrichment';

describe('detectLanguageFromText', () => {
  it('returns null for empty / very short input', () => {
    expect(detectLanguageFromText(null)).toBeNull();
    expect(detectLanguageFromText('')).toBeNull();
    expect(detectLanguageFromText('hi')).toBeNull();
  });

  it('detects Russian (Cyrillic)', () => {
    expect(detectLanguageFromText('Простой обзор фильмов и сериалов')).toBe('ru');
  });

  it('detects Japanese via hiragana/katakana', () => {
    expect(detectLanguageFromText('こんにちは、ようこそ私のチャンネルへ')).toBe('ja');
  });

  it('detects Chinese', () => {
    expect(detectLanguageFromText('欢迎来到我的频道，这里有很多有趣的视频内容')).toBe('zh');
  });

  it('detects Arabic', () => {
    expect(detectLanguageFromText('مرحبا بكم في قناتي الجديدة على يوتيوب')).toBe('ar');
  });

  it('detects Hindi (Devanagari)', () => {
    expect(detectLanguageFromText('मेरे चैनल में आपका स्वागत है')).toBe('hi');
  });

  it('falls back to English for plain Latin text', () => {
    expect(detectLanguageFromText('Welcome to my channel about gardening tips')).toBe('en');
  });

  it('strips URLs before sampling', () => {
    // Only URL + spacing left after stripping → too short to detect
    expect(detectLanguageFromText('https://example.com/foo')).toBeNull();
  });
});

describe('extractSocialLinks', () => {
  it('returns null when no links found', () => {
    expect(extractSocialLinks('A normal description without links.')).toBeNull();
    expect(extractSocialLinks('')).toBeNull();
  });

  it('extracts instagram, twitter, tiktok, youtube', () => {
    const desc = `
      Follow me on https://www.instagram.com/example
      Twitter: twitter.com/example
      TikTok: https://tiktok.com/@example
      YouTube: youtube.com/@example
    `;
    const result = extractSocialLinks(desc);
    expect(result).not.toBeNull();
    const arr = JSON.parse(result!);
    expect(arr.length).toBeGreaterThanOrEqual(4);
    expect(arr.some((s: string) => s.includes('instagram'))).toBe(true);
    expect(arr.some((s: string) => s.includes('twitter'))).toBe(true);
    expect(arr.some((s: string) => s.includes('tiktok'))).toBe(true);
  });

  it('deduplicates repeated links', () => {
    const desc = 'IG: instagram.com/foo and again instagram.com/foo';
    const result = extractSocialLinks(desc);
    expect(result).not.toBeNull();
    const arr = JSON.parse(result!);
    expect(arr.length).toBe(1);
  });
});
