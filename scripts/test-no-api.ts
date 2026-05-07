import 'dotenv/config';
import { getClient } from '../lib/db';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

async function rss(channelId: string) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const text = r.ok ? await r.text() : '';
  const ok = r.ok && text.includes('<entry>');
  const lastMatch = text.match(/<published>([^<]+)<\/published>/);
  const titleMatch = text.match(/<title>([^<]+)<\/title>/);
  return { status: r.status, ok, last: lastMatch?.[1]?.slice(0, 10), title: titleMatch?.[1] };
}

async function html(channelId: string) {
  const url = `https://www.youtube.com/channel/${channelId}/about?hl=en`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
  if (!r.ok) return { status: r.status, ok: false };
  const html = await r.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  const ok = !!m;
  let parsed: any = null;
  if (m) {
    try { parsed = JSON.parse(m[1]); } catch {}
  }
  const meta = parsed?.metadata?.channelMetadataRenderer;
  const header = parsed?.header?.c4TabbedHeaderRenderer || parsed?.header?.pageHeaderRenderer;
  return {
    status: r.status,
    ok,
    title: meta?.title,
    description: meta?.description?.slice(0, 80),
    keywords: meta?.keywords?.slice(0, 80),
    country: header?.country || meta?.country,
    avatar: header?.avatar?.thumbnails?.[0]?.url || meta?.avatar?.thumbnails?.[0]?.url,
    subs: header?.subscriberCountText?.simpleText
      || header?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[1]?.text?.content,
  };
}

async function innertube(channelId: string) {
  const url = 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false';
  const body = {
    context: {
      client: {
        hl: 'en', gl: 'US', clientName: 'WEB', clientVersion: '2.20250115.00.00',
      },
    },
    browseId: channelId,
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
  });
  if (!r.ok) return { status: r.status, ok: false };
  const j: any = await r.json();
  const meta = j?.metadata?.channelMetadataRenderer;
  const header = j?.header?.c4TabbedHeaderRenderer || j?.header?.pageHeaderRenderer;
  const microformat = j?.microformat?.microformatDataRenderer;
  return {
    status: r.status,
    ok: !!meta,
    title: meta?.title,
    descLen: meta?.description?.length,
    country: meta?.country,
    keywordsLen: meta?.keywords?.length,
    avatar: meta?.avatar?.thumbnails?.[0]?.url,
    subsText: header?.subscriberCountText?.simpleText
      || header?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[1]?.text?.content,
    videoCountText: header?.videosCountText?.runs?.map((r: any) => r.text).join(''),
    tags: microformat?.tags?.slice(0, 5),
    publishedAt: microformat?.publishDate || meta?.publishDate,
  };
}

async function main() {
  const c = getClient();
  const r = await c.execute({
    sql: "SELECT id, title FROM channels WHERE id LIKE 'UC%' AND LENGTH(id) = 24 ORDER BY subscribers DESC LIMIT 3",
    args: [],
  });
  const samples = r.rows.map((row: any) => ({ id: row.id as string, title: row.title as string }));
  console.log(`Sampling ${samples.length} channels:\n`);

  for (const { id, title } of samples) {
    console.log(`==== ${id} (${title}) ====`);
    const [a, b, d] = await Promise.all([rss(id), innertube(id), html(id)]);
    console.log('RSS:      ', JSON.stringify(a, null, 2));
    console.log('Innertube:', JSON.stringify(b, null, 2));
    console.log('HTML:     ', JSON.stringify(d, null, 2));
    console.log();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
