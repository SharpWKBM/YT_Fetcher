/**
 * Single-select niche dropdown — searchable, with per-niche count.
 * Replaces the legacy CSS-Modules version. Used in the home sidebar.
 */
import * as React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Niche {
  name: string;
  count: number;
}

interface Props {
  selectedNiche: string;
  onNicheChange: (niche: string) => void;
}

export default function NicheFilter({ selectedNiche, onNicheChange }: Props) {
  const [niches, setNiches] = React.useState<Niche[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/niches/list');
        const data = await r.json();
        if (!cancelled && data.success) setNiches(data.niches as Niche[]);
      } catch (e) {
        console.error('Error fetching niches:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = niches.filter(n => n.name.toLowerCase().includes(query.toLowerCase()));

  function select(name: string) {
    onNicheChange(name === selectedNiche ? '' : name);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-background',
          'px-3 py-2 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span className="truncate">{selectedNiche || 'All niches'}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="rounded-md border border-input bg-background p-2 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search niches…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
              aria-label="Search niches"
            />
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => select('')}
              className={cn(
                'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm',
                'hover:bg-accent hover:text-accent-foreground',
                !selectedNiche && 'bg-accent/50 font-medium',
              )}
            >
              All niches
            </button>

            {loading ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Loading niches…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No niches match.
              </div>
            ) : (
              filtered.map(niche => (
                <button
                  key={niche.name}
                  type="button"
                  onClick={() => select(niche.name)}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    selectedNiche === niche.name && 'bg-accent/50 font-medium',
                  )}
                >
                  <span className="flex-1 truncate">{niche.name}</span>
                  <span className="text-xs text-muted-foreground">{niche.count}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
