import { describe, it, expect } from '@jest/globals';
import { parseCount, isChannelId } from '../../lib/youtube/no-api/http';

describe('parseCount', () => {
  it('returns null for empty / nullish input', () => {
    expect(parseCount(null)).toBeNull();
    expect(parseCount(undefined)).toBeNull();
    expect(parseCount('')).toBeNull();
    expect(parseCount('No subscribers')).toBeNull();
  });

  it('parses K/M/B suffixes', () => {
    expect(parseCount('1.5K subscribers')).toBe(1500);
    expect(parseCount('311M subscribers')).toBe(311_000_000);
    expect(parseCount('2.5B views')).toBe(2_500_000_000);
  });

  it('handles plain numbers and commas', () => {
    expect(parseCount('1234')).toBe(1234);
    expect(parseCount('5,234 subscribers')).toBe(5234);
  });

  it('is case-insensitive on the suffix', () => {
    expect(parseCount('80.7m subscribers')).toBe(80_700_000);
    expect(parseCount('80.7M SUBSCRIBERS')).toBe(80_700_000);
  });
});

describe('isChannelId', () => {
  it('accepts canonical UC + 22 base64-url chars', () => {
    expect(isChannelId('UCq-Fj5jknLsUf-MWSy4_brA')).toBe(true);
    expect(isChannelId('UC295-Dw_tDNtZXFeAPAW6Aw')).toBe(true);
  });

  it('rejects malformed ids', () => {
    expect(isChannelId('foobar')).toBe(false);
    expect(isChannelId('UCtoo-short')).toBe(false);
    expect(isChannelId('UCq-Fj5jknLsUf-MWSy4_brA_extra')).toBe(false); // too long
    expect(isChannelId('uCq-Fj5jknLsUf-MWSy4_brA')).toBe(false); // wrong prefix case
    expect(isChannelId('@handle')).toBe(false);
  });
});
