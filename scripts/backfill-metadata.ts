/**
 * Resumable channel-metadata backfill.
 *
 * Iterates the `channels` table, calling lib/enrichment.ts in batches until
 * either the remaining count hits zero, the user-supplied --limit is reached,
 * or the process receives SIGINT/SIGTERM.
 *
 * Resumability is implicit: enrichChannelBatch updates `fetched_at` on every
 * row it touches, and getChannelsNeedingEnrichment filters out anything
 * fetched in the last 7 days. Restart the script and it picks up exactly
 * where it left off, no separate checkpoint table needed.
 *
 * Usage:
 *   npx tsx scripts/backfill-metadata.ts                   # full run, default settings
 *   npx tsx scripts/backfill-metadata.ts --batch-size 25 --limit 200
 *   npx tsx scripts/backfill-metadata.ts --dry-run         # preview only, no DB writes
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  enrichChannelBatch,
  getChannelsNeedingEnrichment,
  getRemainingChannelsCount,
} from '../lib/enrichment';

/**
 * Checkpoint file lives next to the script. Single line of JSON with the last
 * channel id we touched + a tiny stats blob. Survives PC sleep, crashes, and
 * Ctrl+C. Delete the file (or pass --reset) to start over from id 0.
 */
const CHECKPOINT_PATH = path.join(__dirname, '.backfill-checkpoint.json');

interface Checkpoint {
  lastId: string | null;
  processed: number;
  totalOk: number;
  totalFailed: number;
  startedAt: string;
  updatedAt: string;
}

function readCheckpoint(): Checkpoint | null {
  try {
    if (!fs.existsSync(CHECKPOINT_PATH)) return null;
    const raw = fs.readFileSync(CHECKPOINT_PATH, 'utf8');
    return JSON.parse(raw) as Checkpoint;
  } catch {
    return null;
  }
}

function writeCheckpoint(cp: Checkpoint): void {
  // Atomic write: write to temp file, rename. Avoids partial writes on crash.
  const tmp = CHECKPOINT_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cp, null, 2));
  fs.renameSync(tmp, CHECKPOINT_PATH);
}

function deleteCheckpoint(): void {
  try {
    fs.unlinkSync(CHECKPOINT_PATH);
  } catch {
    // ignore
  }
}

interface Args {
  batchSize: number;
  limit: number;
  dryRun: boolean;
  delayMs: number;
  reset: boolean;
  /** Hours to wait before re-touching a channel. Defaults to 24h, which lets us
   * skip rows the previous run already processed even if their fields are still
   * NULL (e.g. country that YouTube doesn't expose). Use 0 to force re-fetch. */
  cooldownHours: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, def: string) => {
    const i = argv.indexOf(flag);
    return i === -1 || i === argv.length - 1 ? def : argv[i + 1];
  };
  return {
    batchSize: Math.min(Math.max(parseInt(get('--batch-size', '50'), 10), 1), 200),
    limit: parseInt(get('--limit', '0'), 10), // 0 = no limit
    dryRun: argv.includes('--dry-run'),
    delayMs: parseInt(get('--delay-ms', '500'), 10),
    reset: argv.includes('--reset'),
    cooldownHours: parseInt(get('--cooldown-hours', '24'), 10),
  };
}

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

let stopping = false;
process.on('SIGINT', () => {
  if (stopping) {
    console.log('\n[Backfill] Force-quit.');
    process.exit(130);
  }
  stopping = true;
  console.log('\n[Backfill] SIGINT received — finishing current batch and exiting…');
});
process.on('SIGTERM', () => {
  stopping = true;
});

async function main() {
  const args = parseArgs();
  console.log('[Backfill] Config:', args);

  if (args.reset) {
    deleteCheckpoint();
    console.log('[Backfill] Checkpoint reset.');
  }

  // Backfill walks the table monotonically by primary key. The afterId cursor
  // is persisted to disk after every batch so PC sleep, crashes, or Ctrl+C
  // resume cleanly without re-fetching channels we already processed.
  const existing = readCheckpoint();
  let lastId: string | undefined = existing?.lastId ?? undefined;
  let processed = existing?.processed ?? 0;
  let totalOk = existing?.totalOk ?? 0;
  let totalFailed = existing?.totalFailed ?? 0;
  if (existing) {
    console.log(
      `[Backfill] Resuming from checkpoint: lastId=${lastId} processed=${processed} ok=${totalOk} fail=${totalFailed}`,
    );
    console.log(`[Backfill] Started: ${existing.startedAt} | Last update: ${existing.updatedAt}`);
  }
  const startedAt = existing?.startedAt ?? new Date().toISOString();

  const fetchOpts = { cooldownHours: args.cooldownHours };

  if (args.dryRun) {
    const sample = await getChannelsNeedingEnrichment(args.batchSize, fetchOpts);
    console.log(`[Backfill] DRY RUN — would process up to ${args.limit || 'all'} starting with batch of ${sample.length}:`);
    for (const c of sample.slice(0, 5)) {
      console.log(`  ${c.id} | ${c.title} | lang=${c.language ?? 'NULL'} thumb=${c.thumbnail_url ? 'Y' : 'N'} last=${c.last_upload_date ?? 'NULL'}`);
    }
    return;
  }

  const startTotal = await getRemainingChannelsCount();
  console.log(`[Backfill] ${startTotal} channels need enrichment.`);
  if (startTotal === 0) {
    console.log('[Backfill] Nothing to do.');
    return;
  }

  const startTs = Date.now();
  const initialProcessed = processed; // for accurate rate calc when resuming

  while (!stopping) {
    if (args.limit > 0 && processed >= args.limit) {
      console.log(`[Backfill] Reached --limit ${args.limit}, stopping.`);
      break;
    }

    const remaining = await getRemainingChannelsCount();
    if (remaining === 0) {
      console.log('[Backfill] All channels enriched. Done.');
      break;
    }

    const target = args.limit > 0
      ? Math.min(args.batchSize, args.limit - processed)
      : args.batchSize;

    const batch = await getChannelsNeedingEnrichment(target, {
      ...fetchOpts,
      afterId: lastId,
    });
    if (batch.length === 0) {
      console.log('[Backfill] No more enrichable channels. Stopping.');
      break;
    }

    const stats = await enrichChannelBatch(batch);
    lastId = batch[batch.length - 1].id; // already sorted ASC by id
    processed += batch.length;
    totalOk += stats.enriched;
    totalFailed += stats.failed + stats.skipped;

    // Persist checkpoint after every batch. Cheap (~few KB write).
    writeCheckpoint({
      lastId: lastId ?? null,
      processed,
      totalOk,
      totalFailed,
      startedAt,
      updatedAt: new Date().toISOString(),
    });

    const elapsed = (Date.now() - startTs) / 1000;
    // Rate is for the current run only — checkpoint resumes shouldn't credit
    // their pre-existing `processed` count to elapsed wall time.
    const rate = (processed - initialProcessed) / elapsed;
    const stillRemaining = await getRemainingChannelsCount();
    const eta = rate > 0 ? stillRemaining / rate : Infinity;

    console.log(
      `[Backfill] processed=${processed} ok=${totalOk} fail=${totalFailed} | ` +
      `remaining=${stillRemaining} | rate=${rate.toFixed(2)}/s | eta=${formatEta(eta)}`,
    );

    if (args.delayMs > 0 && !stopping) {
      await new Promise(r => setTimeout(r, args.delayMs));
    }
  }

  const elapsed = (Date.now() - startTs) / 1000;
  const remaining = await getRemainingChannelsCount();
  console.log(`\n[Backfill] Run summary:`);
  console.log(`  processed:     ${processed}`);
  console.log(`  ok:            ${totalOk}`);
  console.log(`  failed/skip:   ${totalFailed}`);
  console.log(`  elapsed:       ${formatEta(elapsed)}`);
  console.log(`  remaining DB:  ${remaining}`);
  console.log(`  checkpoint:    ${CHECKPOINT_PATH}`);
  if (remaining === 0 || (lastId && lastId.startsWith('UCzz'))) {
    // Hit the end of the table — checkpoint is no longer useful.
    deleteCheckpoint();
    console.log(`[Backfill] Cleared checkpoint (run complete).`);
  }
}

main().catch(err => {
  console.error('[Backfill] Fatal:', err);
  process.exit(1);
});
