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
import {
  enrichChannelBatch,
  getChannelsNeedingEnrichment,
  getRemainingChannelsCount,
} from '../lib/enrichment';

interface Args {
  batchSize: number;
  limit: number;
  dryRun: boolean;
  delayMs: number;
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

  // Backfill walks the table monotonically by primary key. We remember the
  // last id we touched and pass it as `afterId` to the next query, which
  // guarantees every row is processed at most once per run regardless of
  // whether all its enrichable fields could be filled (country/region often
  // can't, since YouTube hides them).
  let lastId: string | undefined = undefined;

  if (args.dryRun) {
    const sample = await getChannelsNeedingEnrichment(args.batchSize, { cooldownDays: 0 });
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
  let processed = 0;
  let totalOk = 0;
  let totalFailed = 0;

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
      cooldownDays: 0,
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

    const elapsed = (Date.now() - startTs) / 1000;
    const rate = processed / elapsed; // rows/sec
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
  console.log(`\n[Backfill] Run summary:`);
  console.log(`  processed:     ${processed}`);
  console.log(`  ok:            ${totalOk}`);
  console.log(`  failed/skip:   ${totalFailed}`);
  console.log(`  elapsed:       ${formatEta(elapsed)}`);
  console.log(`  remaining DB:  ${await getRemainingChannelsCount()}`);
}

main().catch(err => {
  console.error('[Backfill] Fatal:', err);
  process.exit(1);
});
