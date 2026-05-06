import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Breadcrumbs.module.css';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();

  // Auto-generate breadcrumbs from route if not provided
  const breadcrumbs = items || generateBreadcrumbs(router.pathname, router.query);

  // Generate BreadcrumbList schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'}${item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <ol className={styles.list}>
          {breadcrumbs.map((item, index) => (
            <li key={item.href} className={styles.item}>
              {index < breadcrumbs.length - 1 ? (
                <>
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                  <span className={styles.separator}>/</span>
                </>
              ) : (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

function generateBreadcrumbs(pathname: string, query: any): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  if (pathname === '/') {
    return breadcrumbs;
  }

  // Features page
  if (pathname === '/features') {
    breadcrumbs.push({ label: 'Features', href: '/features' });
    return breadcrumbs;
  }

  // Pricing page
  if (pathname === '/pricing') {
    breadcrumbs.push({ label: 'Pricing', href: '/pricing' });
    return breadcrumbs;
  }

  // Channel profile page
  if (pathname.startsWith('/channels/')) {
    breadcrumbs.push({ label: 'Channels', href: '/' });
    if (query.channelName) {
      breadcrumbs.push({ label: query.channelName as string, href: pathname });
    } else {
      breadcrumbs.push({ label: 'Channel Profile', href: pathname });
    }
    return breadcrumbs;
  }

  // Browse category page
  if (pathname.startsWith('/browse/')) {
    breadcrumbs.push({ label: 'Browse', href: '/' });
    const category = query.category as string;
    const categoryLabels: Record<string, string> = {
      'inactive-3-6': 'Inactive 3-6 Months',
      'inactive-6-12': 'Inactive 6-12 Months',
      'inactive-12plus': 'Inactive 12+ Months',
      'small': 'Small Channels',
      'medium': 'Medium Channels',
      'large': 'Large Channels',
    };
    breadcrumbs.push({
      label: categoryLabels[category] || category,
      href: pathname,
    });
    return breadcrumbs;
  }

  return breadcrumbs;
}
