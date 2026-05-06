import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import ParticleBackground from '@/components/ParticleBackground/ParticleBackground'
import SpotlightCursor from '@/components/SpotlightCursor/SpotlightCursor'
import GoogleAnalytics from '@/components/Analytics/GoogleAnalytics'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''} />
      <ParticleBackground />
      <SpotlightCursor />
      <Component {...pageProps} />
    </SessionProvider>
  )
}
