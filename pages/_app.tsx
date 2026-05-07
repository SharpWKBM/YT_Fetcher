import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import GoogleAnalytics from '@/components/Analytics/GoogleAnalytics';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';

/**
 * Pre-paint theme bootstrap.
 * Runs synchronously before React hydrates so we never flash the wrong theme.
 * Reads localStorage["theme"] (set by ThemeToggle) and falls back to the OS
 * preference when no value is stored.
 */
const themeBootstrap = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var t = stored || (prefersDark ? 'dark' : 'light');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </Head>
      <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''} />
      <ThemeToggle className="fixed right-4 top-4 z-50 bg-background/80 shadow-sm backdrop-blur" />
      <Component {...pageProps} />
    </>
  );
}
