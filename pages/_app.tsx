import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import ParticleBackground from '@/components/ParticleBackground/ParticleBackground'
import SpotlightCursor from '@/components/SpotlightCursor/SpotlightCursor'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ParticleBackground />
      <SpotlightCursor />
      <Component {...pageProps} />
    </SessionProvider>
  )
}
