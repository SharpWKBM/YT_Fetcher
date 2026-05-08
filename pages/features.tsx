import Link from 'next/link';
import {
  Search,
  Save,
  BarChart3,
  Rocket,
  Target,
  Lock,
  Check,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import Meta from '@/components/SEO/Meta';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: string[];
}

const FEATURES: Feature[] = [
  {
    icon: Search,
    title: 'Advanced search filters',
    body: 'Find exactly what you’re looking for with granular controls.',
    bullets: [
      'Subscriber range (10K – 10M+)',
      'Language and region targeting',
      'Inactivity period (3–24+ months)',
      'Sort by subscribers or last upload',
      'Combine custom filter sets',
    ],
  },
  {
    icon: Save,
    title: 'Save & organize',
    body: 'Keep track of promising channels.',
    bullets: [
      'Save custom search filters',
      'Favorite channels for later review',
      'Export results to CSV (Pro+)',
      'Track viewing history',
      'Organize by categories',
    ],
  },
  {
    icon: BarChart3,
    title: 'Channel insights',
    body: 'Make informed decisions with detailed data.',
    bullets: [
      'Subscriber count and growth trends',
      'Last upload date and inactivity period',
      'Channel language and region',
      'Direct links to YouTube channels',
      'Historical performance data',
    ],
  },
  {
    icon: Rocket,
    title: 'Regular updates',
    body: 'Stay ahead with fresh data.',
    bullets: [
      'Daily database updates',
      'New channels added regularly',
      'Automated activity monitoring',
      'Email alerts for new opportunities (Pro+)',
      'Real-time availability status',
    ],
  },
  {
    icon: Target,
    title: 'Smart recommendations',
    body: 'Discover channels you might have missed.',
    bullets: [
      'Similar channel suggestions',
      'Trending niches and categories',
      'Best value opportunities',
      'Recently inactive channels',
      'High-growth potential picks',
    ],
  },
  {
    icon: Lock,
    title: 'Secure & private',
    body: 'Your data is safe with us.',
    bullets: [
      'Encrypted data transmission',
      'Secure authentication',
      'Private search history',
      'GDPR compliant',
      'No data sharing with third parties',
    ],
  },
];

interface PlanRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

const PLANS: PlanRow[] = [
  { feature: 'Channels per month', free: '10', pro: '100', enterprise: 'Unlimited' },
  { feature: 'Advanced filters', free: 'Basic', pro: true, enterprise: true },
  { feature: 'Save searches', free: false, pro: true, enterprise: true },
  { feature: 'Export to CSV', free: false, pro: true, enterprise: true },
  { feature: 'API access', free: false, pro: false, enterprise: true },
  { feature: 'Priority support', free: false, pro: true, enterprise: true },
];

export default function Features() {
  return (
    <>
      <Meta
        title="Features – YouTube Channel Finder"
        description="Advanced search, saved filters, exports, and channel insights for finding inactive YouTube channels worth acquiring."
      />

      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border/60">
          <div className="container py-12 sm:py-16">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need to find the right channel
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Filter, compare, and track YouTube channels for acquisition with a
              quota-free pipeline that surfaces fresh data daily.
            </p>
          </div>
        </header>

        <main className="container py-12">
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <Card key={f.title}>
                <CardContent className="space-y-4 p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{f.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {f.bullets.map(b => (
                      <li key={b} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">Compare plans</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-4 font-semibold">Feature</th>
                      <th className="p-4 font-semibold">Free</th>
                      <th className="p-4 font-semibold">Pro</th>
                      <th className="p-4 font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {PLANS.map(row => (
                      <tr key={row.feature}>
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4">
                          <PlanCell value={row.free} />
                        </td>
                        <td className="p-4">
                          <PlanCell value={row.pro} />
                        </td>
                        <td className="p-4">
                          <PlanCell value={row.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section className="mt-16 rounded-xl border border-border/60 bg-muted/30 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold tracking-tight">Ready to get started?</h2>
            <p className="mt-2 text-muted-foreground">
              Join thousands of users finding their next YouTube channel.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/">Start searching</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/browse/inactive-12plus">Browse dormant channels</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function PlanCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-4 w-4 text-primary" aria-label="Included" />;
  if (value === false) return <Minus className="h-4 w-4 text-muted-foreground" aria-label="Not included" />;
  return <span>{value}</span>;
}
