import { useState } from 'react';
import { Loader2, Play, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCount } from '@/lib/utils';

interface EnrichmentStats {
  enriched: number;
  failed: number;
  skipped: number;
  remaining: number;
  duration: number;
}

const TOKEN_STORAGE_KEY = 'admin_enrich_token';

export default function EnrichmentPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(50);
  const [numBatches, setNumBatches] = useState(1);
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  });

  function saveToken(t: string) {
    setToken(t);
    if (typeof window !== 'undefined') {
      if (t) window.localStorage.setItem(TOKEN_STORAGE_KEY, t);
      else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  async function runOne(): Promise<EnrichmentStats | null> {
    if (!token) {
      setError('Set CRON_SECRET first.');
      return null;
    }
    const response = await fetch(`/api/admin/enrich?batchSize=${batchSize}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) {
      setError(data.error ?? `HTTP ${response.status}`);
      return null;
    }
    return data.stats as EnrichmentStats;
  }

  async function runEnrichment() {
    setLoading(true);
    setError(null);
    const stats = await runOne();
    if (stats) setStats(stats);
    setLoading(false);
  }

  async function runMultipleBatches() {
    setLoading(true);
    setError(null);
    let totalEnriched = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let lastRemaining = 0;
    let totalDuration = 0;
    for (let i = 0; i < numBatches; i++) {
      const r = await runOne();
      if (!r) break;
      totalEnriched += r.enriched;
      totalFailed += r.failed;
      totalSkipped += r.skipped;
      lastRemaining = r.remaining;
      totalDuration += r.duration;
      setStats({
        enriched: totalEnriched,
        failed: totalFailed,
        skipped: totalSkipped,
        remaining: lastRemaining,
        duration: totalDuration,
      });
      if (i < numBatches - 1) await new Promise(r => setTimeout(r, 1000));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container max-w-4xl py-12">
        <div className="mb-8 space-y-2">
          <Badge variant="secondary" className="gap-1">
            <Database className="h-3 w-3" /> Admin
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Channel metadata enrichment</h1>
          <p className="text-muted-foreground">
            Trigger one-shot enrichment batches against the no-API pipeline. For full
            backfill of all ~27k channels, prefer{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              npx tsx scripts/backfill-metadata.ts
            </code>{' '}
            from a long-running shell — it&rsquo;s resumable across crashes/sleep.
          </p>
        </div>

        {/* Auth */}
        <Card className="mb-6">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Auth
            </h2>
            <label className="block space-y-1.5">
              <span className="text-sm">CRON_SECRET (Bearer token)</span>
              <Input
                type="password"
                placeholder="paste from Vercel env"
                value={token}
                onChange={e => saveToken(e.target.value)}
                aria-label="CRON_SECRET"
              />
              <span className="text-xs text-muted-foreground">
                Stored in localStorage on this device only.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Last run
            </h2>
            {stats ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Stat label="Enriched" value={formatCount(stats.enriched)} tone="ok" />
                <Stat label="Failed" value={formatCount(stats.failed)} tone="warn" />
                <Stat label="Skipped" value={formatCount(stats.skipped)} />
                <Stat label="Remaining" value={formatCount(stats.remaining)} />
                <Stat label="Duration" value={`${stats.duration}s`} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No enrichment run yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Single batch
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs text-muted-foreground">Batch size (1–50)</span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={batchSize}
                    onChange={e => setBatchSize(parseInt(e.target.value, 10) || 50)}
                  />
                </label>
                <Button onClick={runEnrichment} disabled={loading || !token} size="lg">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Enrich
                </Button>
              </div>
            </div>

            <div className="border-t border-border/60 pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Multiple batches
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 space-y-1.5">
                  <span className="text-xs text-muted-foreground">
                    Batches (will process {batchSize * numBatches} channels)
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={numBatches}
                    onChange={e => setNumBatches(parseInt(e.target.value, 10) || 1)}
                  />
                </label>
                <Button
                  onClick={runMultipleBatches}
                  disabled={loading || !token}
                  size="lg"
                  variant="secondary"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run {numBatches} batch{numBatches === 1 ? '' : 'es'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Info */}
        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              No-API pipeline
            </div>
            <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
              <li>Innertube + RSS + HTML — no YouTube Data API quota.</li>
              <li>Throughput ~7 channels/sec at concurrency 4.</li>
              <li>Full 27k backfill completes in ~1 hour from CLI.</li>
              <li>This UI is best for one-off retries; CLI is best for bulk runs.</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'default';
}

function Stat({ label, value, tone = 'default' }: StatProps) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={
          tone === 'ok'
            ? 'text-2xl font-semibold text-primary'
            : tone === 'warn'
              ? 'text-2xl font-semibold text-amber-600 dark:text-amber-400'
              : 'text-2xl font-semibold'
        }
      >
        {value}
      </div>
    </div>
  );
}
