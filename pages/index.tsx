import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import Meta from '@/components/SEO/Meta';
import ChannelCard from '@/components/ChannelCard/ChannelCard';
import TagFilter from '@/components/TagFilter';
import NicheFilter from '@/components/NicheFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, formatCount } from '@/lib/utils';

interface Channel {
  id: string;
  title: string;
  subscribers: number;
  language: string | null;
  region: string | null;
  last_upload_date: string | null;
  channel_url: string;
  thumbnail_url: string | null;
  monthsInactive: number | null;
  social_links?: string | null;
  niche?: string | null;
  video_count?: number | null;
}

interface ApiResponse {
  success: boolean;
  data: Channel[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface Preset {
  id: string;
  label: string;
  apply: (s: PresetSetters) => void;
}

interface PresetSetters {
  setMinSubs: (n: number) => void;
  setMaxSubs: (n: number) => void;
  setLanguage: (s: string) => void;
  setRegion: (s: string) => void;
  setInactiveMonths: (n: number) => void;
  setSelectedTags: (t: string[]) => void;
  setSelectedNiche: (n: string) => void;
}

const PRESETS: Preset[] = [
  {
    id: 'all',
    label: 'All channels',
    apply: s => {
      s.setMinSubs(0);
      s.setMaxSubs(10_000_000);
      s.setLanguage('');
      s.setRegion('');
      s.setInactiveMonths(0);
      s.setSelectedTags([]);
      s.setSelectedNiche('');
    },
  },
  {
    id: 'abandoned-large',
    label: 'Abandoned 100K+',
    apply: s => {
      s.setMinSubs(100_000);
      s.setMaxSubs(10_000_000);
      s.setLanguage('');
      s.setRegion('');
      s.setInactiveMonths(12);
      s.setSelectedTags([]);
      s.setSelectedNiche('');
    },
  },
  {
    id: 'abandoned-medium',
    label: 'Abandoned 10K–100K',
    apply: s => {
      s.setMinSubs(10_000);
      s.setMaxSubs(100_000);
      s.setLanguage('');
      s.setRegion('');
      s.setInactiveMonths(6);
      s.setSelectedTags([]);
      s.setSelectedNiche('');
    },
  },
  {
    id: 'russian-inactive',
    label: 'Russian inactive',
    apply: s => {
      s.setMinSubs(10_000);
      s.setMaxSubs(10_000_000);
      s.setLanguage('ru');
      s.setRegion('CIS');
      s.setInactiveMonths(6);
      s.setSelectedTags([]);
      s.setSelectedNiche('');
    },
  },
  {
    id: 'english-inactive',
    label: 'English inactive',
    apply: s => {
      s.setMinSubs(10_000);
      s.setMaxSubs(10_000_000);
      s.setLanguage('en');
      s.setRegion('US');
      s.setInactiveMonths(6);
      s.setSelectedTags([]);
      s.setSelectedNiche('');
    },
  },
];

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [minSubs, setMinSubs] = useState(0);
  const [maxSubs, setMaxSubs] = useState(10_000_000);
  const [language, setLanguage] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [inactiveMonths, setInactiveMonths] = useState(0);
  const [lastActivityRange, setLastActivityRange] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [sortBy, setSortBy] = useState<'subscribers' | 'last_upload_date' | 'niche' | 'tag_count'>(
    'subscribers',
  );
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Mobile filter drawer toggle
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void fetchChannels();
  }, [
    minSubs,
    maxSubs,
    language,
    region,
    inactiveMonths,
    sortBy,
    order,
    page,
    lastActivityRange,
    selectedTags,
    selectedNiche,
  ]);

  async function fetchChannels() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        minSubs: minSubs.toString(),
        maxSubs: maxSubs.toString(),
        inactiveMonths: inactiveMonths.toString(),
        sortBy,
        order,
        page: page.toString(),
        limit: '50',
      });
      if (language) params.append('language', language);
      if (region) params.append('region', region);
      if (lastActivityRange) params.append('lastActivityRange', lastActivityRange);
      if (selectedNiche) params.append('niche', selectedNiche);
      if (selectedTags.length > 0) selectedTags.forEach(t => params.append('tags', t));

      const response = await fetch(`/api/channels?${params}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setChannels(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        setError('Failed to fetch channels');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const presetSetters: PresetSetters = {
    setMinSubs,
    setMaxSubs,
    setLanguage,
    setRegion,
    setInactiveMonths,
    setSelectedTags,
    setSelectedNiche,
  };

  const activeFilterCount = [
    minSubs > 0,
    maxSubs < 10_000_000,
    !!language,
    !!region,
    inactiveMonths > 0,
    !!lastActivityRange,
    selectedTags.length > 0,
    !!selectedNiche,
  ].filter(Boolean).length;

  // Visible channels — apply client-side title search on top of API filters.
  const visible = search.trim()
    ? channels.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : channels;

  return (
    <>
      <Meta
        title="Find Inactive YouTube Channels for Sale | YouTube Channel Finder"
        description="Discover abandoned YouTube channels with 10K-1M+ subscribers. Filter by niche, language, and inactivity. Perfect for channel acquisition and growth opportunities."
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'YouTube Channel Finder',
            description: 'Discover inactive YouTube channels with high subscriber counts for acquisition opportunities',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com',
            applicationCategory: 'BusinessApplication',
          },
        ]}
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Hero ----------------------------------------------------------- */}
        <header className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(60% 60% at 30% 20%, hsl(var(--primary)/0.25), transparent), radial-gradient(40% 40% at 80% 80%, hsl(var(--primary)/0.15), transparent)',
            }}
            aria-hidden
          />
          <div className="container py-12 sm:py-16 lg:py-20">
            <Badge variant="secondary" className="mb-4">
              {formatCount(total)} channels indexed
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find inactive YouTube channels for acquisition
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Discover undervalued channels worldwide with high subscriber counts but stalled
              uploads. Perfect for acquisition, growth, and revival.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search loaded channels by title…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                  aria-label="Search channels by title"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(v => !v)}
                aria-expanded={filtersOpen}
                className="gap-2 sm:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Presets */}
            <div className="mt-6 flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <Button
                  key={p.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    p.apply(presetSetters);
                    setPage(1);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Body — sidebar filters + grid ---------------------------------- */}
        <main className="container py-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Filter sidebar (desktop), drawer (mobile) */}
            <aside
              className={cn(
                'lg:w-72 lg:shrink-0',
                'lg:block',
                filtersOpen ? 'block' : 'hidden lg:block',
              )}
            >
              <Card>
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Filters
                    </h2>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          PRESETS[0].apply(presetSetters);
                          setLastActivityRange('');
                          setPage(1);
                        }}
                        className="h-7 gap-1 text-xs"
                      >
                        <X className="h-3 w-3" /> Clear
                      </Button>
                    )}
                  </div>

                  <FilterField label="Min subscribers">
                    <Input
                      type="number"
                      value={minSubs}
                      min={0}
                      onChange={e => {
                        setMinSubs(Number(e.target.value));
                        setPage(1);
                      }}
                    />
                  </FilterField>

                  <FilterField label="Max subscribers">
                    <Input
                      type="number"
                      value={maxSubs}
                      min={0}
                      onChange={e => {
                        setMaxSubs(Number(e.target.value));
                        setPage(1);
                      }}
                    />
                  </FilterField>

                  <FilterField label="Language">
                    <NativeSelect
                      value={language}
                      onChange={v => {
                        setLanguage(v);
                        setPage(1);
                      }}
                      options={[
                        { value: '', label: 'All languages' },
                        { value: 'en', label: 'English' },
                        { value: 'ru', label: 'Russian' },
                        { value: 'es', label: 'Spanish' },
                        { value: 'de', label: 'German' },
                        { value: 'fr', label: 'French' },
                        { value: 'ja', label: 'Japanese' },
                        { value: 'ko', label: 'Korean' },
                        { value: 'zh', label: 'Chinese' },
                        { value: 'hi', label: 'Hindi' },
                        { value: 'ar', label: 'Arabic' },
                      ]}
                    />
                  </FilterField>

                  <FilterField label="Region">
                    <NativeSelect
                      value={region}
                      onChange={v => {
                        setRegion(v);
                        setPage(1);
                      }}
                      options={[
                        { value: '', label: 'All regions' },
                        { value: 'US', label: 'United States' },
                        { value: 'UK', label: 'United Kingdom' },
                        { value: 'CIS', label: 'CIS (RU/UA/BY)' },
                        { value: 'EU', label: 'European Union' },
                        { value: 'Asia', label: 'Asia' },
                      ]}
                    />
                  </FilterField>

                  <FilterField label="Inactive for">
                    <NativeSelect
                      value={String(inactiveMonths)}
                      onChange={v => {
                        setInactiveMonths(Number(v));
                        setPage(1);
                      }}
                      options={[
                        { value: '0', label: 'Any (incl. active)' },
                        { value: '3', label: '3+ months' },
                        { value: '6', label: '6+ months' },
                        { value: '12', label: '12+ months' },
                        { value: '24', label: '24+ months' },
                      ]}
                    />
                  </FilterField>

                  <FilterField label="Last activity range">
                    <NativeSelect
                      value={lastActivityRange}
                      onChange={v => {
                        setLastActivityRange(v);
                        setPage(1);
                      }}
                      options={[
                        { value: '', label: 'All channels' },
                        { value: '1-3mo', label: '1–3 months ago' },
                        { value: '3-6mo', label: '3–6 months ago' },
                        { value: '6-12mo', label: '6–12 months ago' },
                        { value: '12-24mo', label: '12–24 months ago' },
                        { value: '24+mo', label: '24+ months (dormant)' },
                      ]}
                    />
                  </FilterField>

                  <FilterField label="Sort by">
                    <NativeSelect
                      value={sortBy}
                      onChange={v => {
                        setSortBy(v as typeof sortBy);
                        setPage(1);
                      }}
                      options={[
                        { value: 'subscribers', label: 'Subscribers' },
                        { value: 'last_upload_date', label: 'Last upload' },
                        { value: 'niche', label: 'Niche' },
                        { value: 'tag_count', label: 'Tag count' },
                      ]}
                    />
                  </FilterField>

                  <FilterField label="Order">
                    <NativeSelect
                      value={order}
                      onChange={v => {
                        setOrder(v as 'ASC' | 'DESC');
                        setPage(1);
                      }}
                      options={[
                        { value: 'DESC', label: 'Descending' },
                        { value: 'ASC', label: 'Ascending' },
                      ]}
                    />
                  </FilterField>

                  <div className="space-y-3 border-t border-border/60 pt-4">
                    <TagFilter
                      selectedTags={selectedTags}
                      onTagsChange={tags => {
                        setSelectedTags(tags);
                        setPage(1);
                      }}
                    />
                    <NicheFilter
                      selectedNiche={selectedNiche}
                      onNicheChange={niche => {
                        setSelectedNiche(niche);
                        setPage(1);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Results */}
            <section className="flex-1 min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                    </span>
                  ) : (
                    <>
                      Showing <span className="font-semibold text-foreground">{visible.length}</span> of{' '}
                      <span className="font-semibold text-foreground">{formatCount(total)}</span> channels
                    </>
                  )}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="aspect-square w-full rounded-t-xl rounded-b-none" />
                      <CardContent className="space-y-3 p-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <p className="text-base font-medium">No channels match your filters.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try widening your subscriber range or clearing filters.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        PRESETS[0].apply(presetSetters);
                        setPage(1);
                      }}
                    >
                      Reset filters
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visible.map((channel, index) => (
                    <ChannelCard key={channel.id} channel={channel} index={index} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && !loading && (
                <nav
                  aria-label="Pagination"
                  className="mt-8 flex items-center justify-center gap-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page <span className="font-semibold text-foreground">{page}</span> of{' '}
                    <span className="font-semibold text-foreground">{totalPages}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </section>
          </div>

          {/* FAQ */}
          <section className="mt-20 grid gap-6 md:grid-cols-3">
            <FAQItem
              q="What is an inactive YouTube channel?"
              a="An inactive channel hasn't uploaded new content for an extended period (typically 3+ months). These channels may be available for acquisition or collaboration."
            />
            <FAQItem
              q="How often is the channel data updated?"
              a="Our database is refreshed via a quota-free Innertube + RSS pipeline. Subscriber counts and upload dates stay current within days."
            />
            <FAQItem
              q="How do I find channels in a specific niche?"
              a="Use the niche, tag, and language filters in the sidebar. Combine with subscriber range to narrow to your target audience."
            />
          </section>
        </main>

        <footer className="border-t border-border/60">
          <div className="container py-8 text-center text-sm text-muted-foreground">
            Free YouTube channel discovery — find inactive channels for acquisition opportunities.
          </div>
        </footer>
      </div>
    </>
  );
}

// ----- helpers ------------------------------------------------------------

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

interface NativeSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}

function NativeSelect({ value, onChange, options }: NativeSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold">{q}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{a}</p>
      </CardContent>
    </Card>
  );
}
