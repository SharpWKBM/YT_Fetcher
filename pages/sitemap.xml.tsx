import { GetServerSideProps } from 'next';
import { getChannels } from '@/lib/db';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';

  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily', lastmod: new Date().toISOString() },
    { url: '/features', priority: '0.8', changefreq: 'weekly', lastmod: new Date().toISOString() },
    { url: '/pricing', priority: '0.8', changefreq: 'weekly', lastmod: new Date().toISOString() },
  ];

  // Browse category pages
  const categoryPages = [
    { url: '/browse/inactive-3-6', priority: '0.7', changefreq: 'daily', lastmod: new Date().toISOString() },
    { url: '/browse/inactive-6-12', priority: '0.7', changefreq: 'daily', lastmod: new Date().toISOString() },
    { url: '/browse/inactive-12plus', priority: '0.7', changefreq: 'daily', lastmod: new Date().toISOString() },
    { url: '/browse/small', priority: '0.7', changefreq: 'daily', lastmod: new Date().toISOString() },
    { url: '/browse/medium', priority: '0.7', changefreq: 'daily', lastmod: new Date().toISOString() },
    { url: '/browse/large', priority: '0.7', changefreq: 'daily', lastmod: new Date().toISOString() },
  ];

  // Fetch channel pages from database (limit to 10,000 for sitemap size)
  let channelPages: Array<{ url: string; priority: string; changefreq: string; lastmod: string }> = [];
  try {
    const result = await getChannels({
      page: 1,
      limit: 10000,
      sortBy: 'subscribers',
      order: 'DESC',
    });

    channelPages = result.channels.map(channel => ({
      url: `/channels/${channel.id}`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: channel.fetched_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching channels for sitemap:', error);
  }

  const allPages = [...staticPages, ...categoryPages, ...channelPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allPages.map(page => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
