// lib/scrapers/channel-discovery.ts
import { collectChannelData } from './data-collector';
import { ChannelData } from './types';

// Seed channels for different regions (known popular channels)
const SEED_CHANNELS: Record<string, string[]> = {
  US: [
    'UCX6OQ3DkcsbYNE6H8uQQuVA', // MrBeast
    'UCbCmjCuTUZos6Inko4u57UQ', // Vsauce
    'UCsooa4yRKGN_zEE8iknghZA', // TED-Ed
  ],
  RU: [
    'UCMCgOm8GZkHp8zJ6l7_hIuA', // вДудь
    'UC101o-vQ2iOj5gLWB7eqxXA', // Ян Топлес
    'UCrBReWfRZr8n-rbAiLvyOPw', // Редакция
  ],
  UK: [
    'UC2C_jShtL725hvbm1arSV9w', // CGP Grey
    'UCsXVk37bltHxD1rDPwtNM8Q', // Kurzgesagt
  ],
  ES: [
    'UCYytdGjlyy2TTghdLR5bNvQ', // El Rubius
    'UCYiGq8XF7YQD00x7wAd62Zg', // AuronPlay
  ],
  BR: [
    'UCmY5Z_iZyqszYdYEpFsGOUw', // Felipe Neto
    'UCYWOjHweP2V-8kGKmmAmQJQ', // Whindersson Nunes
  ],
  DE: [
    'UCzTMnhPYMWQzRJQ8VNOEJyg', // Gronkh
    'UCN1hnUccO4FD5WfM7ithXaw', // Freekickerz
  ],
  FR: [
    'UCWeg2Pkate69NFdBeuRFTAw', // Squeezie
    'UCj8orMezFWVcoN-4S545Wtw', // Cyprien
  ],
  IN: [
    'UCqwUrj10mAEsqezcItqvwEw', // CarryMinati
    'UC_vcKmg67vjMP7ciLnSxSHQ', // Ashish Chanchlani
  ],
  JP: [
    'UCZf__ehlCEBPop-_sldpBUQ', // HikakinTV
    'UC-lHJZR3Gqxm24_Vd_AJ5Yw', // PewDiePie Japan
  ],
};

/**
 * Discover channels by fetching data from seed channels
 * This is a simple approach that doesn't require web scraping
 */
export async function discoverChannelsByRegion(
  region: string,
  maxResults: number = 10
): Promise<ChannelData[]> {
  const seedChannels = SEED_CHANNELS[region] || SEED_CHANNELS['US'];
  const discoveredChannels: ChannelData[] = [];

  console.log(`[Channel Discovery] Starting discovery for region ${region} with ${seedChannels.length} seed channels`);

  // Fetch data for each seed channel
  for (const channelId of seedChannels) {
    if (discoveredChannels.length >= maxResults) break;

    try {
      const channelData = await collectChannelData(channelId);
      if (channelData) {
        // Set region based on seed list
        channelData.region = region;
        discoveredChannels.push(channelData);
        console.log(`[Channel Discovery] Found: ${channelData.title} (${channelData.id})`);
      }
    } catch (error) {
      console.error(`[Channel Discovery] Failed to fetch ${channelId}:`, error);
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[Channel Discovery] Discovered ${discoveredChannels.length} channels for region ${region}`);
  return discoveredChannels;
}

/**
 * Discover channels across all regions
 */
export async function discoverChannelsAllRegions(
  channelsPerRegion: number = 3
): Promise<ChannelData[]> {
  const allChannels: ChannelData[] = [];
  const regions = Object.keys(SEED_CHANNELS);

  console.log(`[Channel Discovery] Starting multi-region discovery across ${regions.length} regions`);

  for (const region of regions) {
    try {
      const channels = await discoverChannelsByRegion(region, channelsPerRegion);
      allChannels.push(...channels);
    } catch (error) {
      console.error(`[Channel Discovery] Failed for region ${region}:`, error);
    }
  }

  console.log(`[Channel Discovery] Total discovered: ${allChannels.length} channels`);
  return allChannels;
}
