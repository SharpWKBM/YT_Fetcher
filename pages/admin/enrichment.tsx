import { useState } from 'react';

interface EnrichmentStats {
  enriched: number;
  failed: number;
  skipped: number;
  remaining: number;
  duration: number;
}

export default function EnrichmentPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(15);
  const [numBatches, setNumBatches] = useState(1);

  const runEnrichment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/enrich?batchSize=${batchSize}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Enrichment failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runMultipleBatches = async () => {
    setLoading(true);
    setError(null);

    let totalEnriched = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (let i = 0; i < numBatches; i++) {
      try {
        const response = await fetch(
          `/api/admin/enrich?batchSize=${batchSize}`,
          { method: 'POST' }
        );

        const data = await response.json();

        if (data.success) {
          totalEnriched += data.stats.enriched;
          totalFailed += data.stats.failed;
          totalSkipped += data.stats.skipped;

          setStats({
            enriched: totalEnriched,
            failed: totalFailed,
            skipped: totalSkipped,
            remaining: data.stats.remaining,
            duration: data.stats.duration,
          });
        }

        // Wait 3 seconds between batches
        if (i < numBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err: any) {
        setError(err.message);
        break;
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Channel Metadata Enrichment</h1>

      <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Current Status</h2>
        {stats && (
          <div>
            <p><strong>Enriched:</strong> {stats.enriched} channels</p>
            <p><strong>Failed:</strong> {stats.failed} channels</p>
            <p><strong>Skipped:</strong> {stats.skipped} channels</p>
            <p><strong>Remaining:</strong> {stats.remaining} channels</p>
            <p><strong>Duration:</strong> {stats.duration} seconds</p>
          </div>
        )}
        {!stats && <p>No enrichment run yet</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Single Batch</h2>
        <label>
          Batch Size:
          <input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value))}
            min="1"
            max="50"
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
        <button
          onClick={runEnrichment}
          disabled={loading}
          style={{
            marginLeft: '20px',
            padding: '10px 20px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Processing...' : 'Enrich Channels'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Multiple Batches</h2>
        <label>
          Number of Batches:
          <input
            type="number"
            value={numBatches}
            onChange={(e) => setNumBatches(parseInt(e.target.value))}
            min="1"
            max="50"
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Will process {batchSize * numBatches} channels total
        </p>
        <button
          onClick={runMultipleBatches}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Processing...' : `Run ${numBatches} Batches`}
        </button>
      </div>

      {error && (
        <div style={{ padding: '15px', background: '#fee', color: '#c00', borderRadius: '5px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h3>Recommendations</h3>
        <ul>
          <li>Run 20 batches (300 channels) 2-3 times per day</li>
          <li>Daily throughput: 600-900 channels</li>
          <li>Complete 27K channels in 30-45 days</li>
          <li>Each batch takes ~10 seconds</li>
        </ul>
      </div>
    </div>
  );
}
