import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import ParticleBackground from '@/components/ParticleBackground/ParticleBackground'
import SpotlightCursor from '@/components/SpotlightCursor/SpotlightCursor'
import GoogleAnalytics from '@/components/Analytics/GoogleAnalytics'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''} />
      <ParticleBackground />
      <SpotlightCursor />
      <Component {...pageProps} />
    </>
  )
}
