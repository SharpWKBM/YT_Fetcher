import { describe, it, expect } from '@jest/globals';
import { parseInnertubePayload } from '../../lib/youtube/no-api/innertube';

/**
 * Fixture-based tests for the Innertube payload parser. These don't hit the
 * network — they feed in JSON shapes that match what /youtubei/v1/browse
 * actually returns (legacy `c4TabbedHeaderRenderer` and the newer
 * `pageHeaderRenderer` view-model) and verify our extractor pulls the
 * right values from each.
 */

const CHANNEL_ID = 'UCq-Fj5jknLsUf-MWSy4_brA';

describe('parseInnertubePayload — legacy c4TabbedHeader shape', () => {
  const payload = {
    metadata: {
      channelMetadataRenderer: {
        title: 'Legacy Channel',
        description: 'Old shape description',
        keywords: 'foo bar baz',
        country: 'US',
        avatar: { thumbnails: [{ url: 'https://small.example/a.jpg', width: 88, height: 88 }] },
        vanityChannelUrl: 'http://www.youtube.com/@legacy',
      },
    },
    header: {
      c4TabbedHeaderRenderer: {
        title: 'Legacy Channel',
        subscriberCountText: { simpleText: '1.2M subscribers' },
        videosCountText: { runs: [{ text: '450' }, { text: ' videos' }] },
        avatar: {
          thumbnails: [
            { url: 'https://small.example/a.jpg', width: 88, height: 88 },
            { url: 'https://big.example/a.jpg', width: 800, height: 800 },
          ],
        },
        banner: {
          thumbnails: [{ url: 'https://banner.example/b.jpg', width: 2120, height: 351 }],
        },
        channelHandleText: { runs: [{ text: '@legacy' }] },
      },
    },
    microformat: {
      microformatDataRenderer: { publishDate: '2010-04-29T00:00:00.000Z' },
    },
  };

  it('extracts title and description', () => {
    const r = parseInnertubePayload(CHANNEL_ID, payload);
    expect(r.title).toBe('Legacy Channel');
    expect(r.description).toBe('Old shape description');
  });

  it('parses subscriber and video counts independently', () => {
    const r = parseInnertubePayload(CHANNEL_ID, payload);
    expect(r.subscribers).toBe(1_200_000);
    expect(r.subscriberCountText).toBe('1.2M subscribers');
    expect(r.videoCount).toBe(450);
    expect(r.videoCountText).toBe('450 videos');
  });

  it('picks the largest avatar thumbnail', () => {
    const r = parseInnertubePayload(CHANNEL_ID, payload);
    expect(r.avatarUrl).toBe('https://big.example/a.jpg');
  });

  it('extracts country, handle, joinedDate, banner', () => {
    const r = parseInnertubePayload(CHANNEL_ID, payload);
    expect(r.country).toBe('US');
    expect(r.handle).toBe('@legacy');
    expect(r.joinedDate).toBe('2010-04-29');
    expect(r.bannerUrl).toBe('https://banner.example/b.jpg');
  });
});

describe('parseInnertubePayload — newer pageHeaderRenderer shape', () => {
  const payload = {
    metadata: {
      channelMetadataRenderer: {
        title: 'Modern Channel',
        description: 'New shape description',
        keywords: 'tag1, tag2',
        avatar: { thumbnails: [{ url: 'https://yt.example/avatar.jpg', width: 900, height: 900 }] },
      },
    },
    header: {
      pageHeaderRenderer: {
        content: {
          pageHeaderViewModel: {
            metadata: {
              contentMetadataViewModel: {
                metadataRows: [
                  {
                    metadataParts: [
                      { text: { content: '@moderncreator' } },
                      { text: { content: '311M subscribers' } },
                      { text: { content: '26K videos' } },
                    ],
                  },
                  {
                    metadataParts: [{ text: { content: 'India' } }],
                  },
                ],
              },
            },
          },
        },
      },
    },
  };

  it('disambiguates subscribers from videos in the same row', () => {
    const r = parseInnertubePayload(CHANNEL_ID, payload);
    expect(r.subscribers).toBe(311_000_000);
    expect(r.videoCount).toBe(26_000);
    // Make sure they aren't the same string (the bug we fixed)
    expect(r.subscriberCountText).not.toBe(r.videoCountText);
  });

  it('falls back to channelMetadataRenderer when c4 absent', () => {
    const r = parseInnertubePayload(CHANNEL_ID, payload);
    expect(r.title).toBe('Modern Channel');
    expect(r.avatarUrl).toBe('https://yt.example/avatar.jpg');
  });
});

describe('parseInnertubePayload — defensive cases', () => {
  it('throws on completely empty payload', () => {
    expect(() => parseInnertubePayload(CHANNEL_ID, {})).toThrow(/missing metadata/);
  });

  it('handles partially missing fields without crashing', () => {
    const r = parseInnertubePayload(CHANNEL_ID, {
      metadata: { channelMetadataRenderer: { title: 'Bare' } },
    });
    expect(r.title).toBe('Bare');
    expect(r.subscribers).toBeNull();
    expect(r.videoCount).toBeNull();
    expect(r.country).toBeNull();
  });
});
