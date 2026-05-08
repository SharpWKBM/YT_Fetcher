/**
 * Multi-select tag dropdown — collapsible, with search and per-tag count.
 * Replaces the legacy CSS-Modules version. Used in the home sidebar.
 */
import * as React from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tag {
  name: string;
  count: number;
}

interface Props {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagFilter({ selectedTags, onTagsChange }: Props) {
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/tags/list');
        const data = await r.json();
        if (!cancelled && data.success) setTags(data.tags as Tag[]);
      } catch (e) {
        console.error('Error fetching tags:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = tags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));

  function toggle(name: string) {
    onTagsChange(
      selectedTags.includes(name)
        ? selectedTags.filter(t => t !== name)
        : [...selectedTags, name],
    );
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
        <span className="flex items-center gap-2">
          Tags
          {selectedTags.length > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-[10px]">
              {selectedTags.length}
            </Badge>
          )}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(t => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              {t}
              <button
                onClick={() => toggle(t)}
                className="rounded-full p-0.5 hover:bg-background/50"
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-md border border-input bg-background p-2 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tags…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
              aria-label="Search tags"
            />
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Loading tags…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No tags match.
              </div>
            ) : (
              filtered.map(tag => {
                const checked = selectedTags.includes(tag.name);
                return (
                  <label
                    key={tag.name}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      checked && 'bg-accent/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(tag.name)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    <span className="text-xs text-muted-foreground">{tag.count}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
