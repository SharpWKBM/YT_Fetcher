/**
 * Shared HTTP utilities: rotating User-Agent, polite throttling, exponential backoff,
 * abort timeouts. Keeps every module here aligned on rate-limit hygiene so we don't
 * trip YouTube's anti-bot heuristics during a 27k-row backfill.
 */

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
];

export function pickUserAgent(): string {
  return UAS[Math.floor(Math.random() * UAS.length)];
}

export interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

/**
 * Fetch with timeout, retries, and exponential backoff. Treats 429/503 and network errors
 * as retryable; 4xx (other than 429) as terminal.
 */
export async function fetchWithRetry(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = opts;
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        body,
        signal: controller.signal,
        headers: {
          'User-Agent': pickUserAgent(),
          'Accept-Language': 'en-US,en;q=0.9',
          ...headers,
        },
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status === 503) {
        lastErr = new Error(`Rate-limited: ${res.status}`);
        await sleep(backoffMs(attempt));
        continue;
      }
      return res;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) await sleep(backoffMs(attempt));
    }
  }

  throw lastErr ?? new Error('fetchWithRetry: exhausted retries');
}

function backoffMs(attempt: number): number {
  // 500ms, 1.5s, 4.5s with jitter
  const base = 500 * Math.pow(3, attempt);
  return base + Math.floor(Math.random() * base * 0.3);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse strings like "1.2M subscribers", "5,234 subscribers", "1.5K subscribers", "No subscribers"
 */
export function parseCount(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[, ]/g, '').toLowerCase();
  const m = cleaned.match(/([\d.]+)\s*([kmb])?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const mult = m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : m[2] === 'b' ? 1_000_000_000 : 1;
  return Math.floor(n * mult);
}

/**
 * Validate that a string is a YouTube channel id (UC + 22 base64-url chars).
 */
export function isChannelId(s: string): boolean {
  return /^UC[A-Za-z0-9_-]{22}$/.test(s);
}
