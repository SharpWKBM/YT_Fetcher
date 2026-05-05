import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';

  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/features', priority: '0.8', changefreq: 'weekly' },
    { url: '/pricing', priority: '0.8', changefreq: 'weekly' },
  ];

  // TODO: Fetch dynamic channel pages from database
  // const channels = await fetchPublicChannels({ limit: 1000 });
  // const channelPages = channels.map(channel => ({
  //   url: `/channels/${channel.id}`,
  //   priority: '0.6',
  //   changefreq: 'monthly',
  //   lastmod: channel.updated_at
  // }));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages.map(page => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
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
