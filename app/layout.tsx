import type { Metadata, Viewport } from 'next'
import { MotionPreferenceProvider } from '@/components/accessibility/motion-preference'
import { OwnerAccessBanner } from '@/components/owner/owner-access-banner'
import { ImageCopyDeterrent } from '@/components/security/image-copy-deterrent'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  metadataBase: new URL('https://thereadingofthewardens.com'),
  title: {
    default: 'The Reading of the Wardens',
    template: '%s | The Reading of the Wardens',
  },
  description: 'The deluxe web edition of The Wardens of Waterdeep, an epic fantasy adventure in the Forgotten Realms born from a Dungeons & Dragons campaign played with an AI Game Master.',
  openGraph: {
    title: 'The Reading of the Wardens',
    description: 'Read The Wardens of Waterdeep, an epic fantasy adventure in the Forgotten Realms, with bonus art, galleries, bookmarks, and optional Read Aloud.',
    url: 'https://thereadingofthewardens.com',
    siteName: 'The Reading of the Wardens',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0e1117',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <Analytics />
        <MotionPreferenceProvider>
          <a href="#main-content" className="wardens-skip-link">Skip to main content</a>
          {children}
        </MotionPreferenceProvider>
        <ImageCopyDeterrent />
        <OwnerAccessBanner />
      </body>
    </html>
  )
}
