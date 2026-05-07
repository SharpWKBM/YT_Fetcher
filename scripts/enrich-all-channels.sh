#!/bin/bash
# Batch script to enrich all channels with missing metadata
# This will process channels in batches of 50 until all are enriched

echo "========================================"
echo "Channel Metadata Enrichment - Full Run"
echo "========================================"
echo ""
echo "This script will enrich all channels missing metadata."
echo "Estimated time: ~2-3 hours for 27,000 channels"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Set batch size and max batches
export BATCH_SIZE=50
export MAX_BATCHES=600

echo ""
echo "Starting enrichment process..."
echo "Batch size: $BATCH_SIZE"
echo "Max batches: $MAX_BATCHES"
echo ""

cd "$(dirname "$0")/.."
npx tsx scripts/enrich-channel-metadata.ts

echo ""
echo "========================================"
echo "Enrichment Complete!"
echo "========================================"
