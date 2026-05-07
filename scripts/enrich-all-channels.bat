@echo off
REM Batch script to enrich all channels with missing metadata
REM This will process channels in batches of 50 until all are enriched

echo ========================================
echo Channel Metadata Enrichment - Full Run
echo ========================================
echo.
echo This script will enrich all channels missing metadata.
echo Estimated time: ~2-3 hours for 27,000 channels
echo.
echo Press Ctrl+C to cancel, or
pause

REM Set batch size and max batches
set BATCH_SIZE=50
set MAX_BATCHES=600

echo.
echo Starting enrichment process...
echo Batch size: %BATCH_SIZE%
echo Max batches: %MAX_BATCHES%
echo.

cd /d "%~dp0.."
npx tsx scripts/enrich-channel-metadata.ts

echo.
echo ========================================
echo Enrichment Complete!
echo ========================================
pause
