import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import PublicFrame from '@/app/components/PublicFrame'
import { GoogleAnalytics } from '@next/third-parties/google'
import ClarityAnalytics from '@/components/Clarity'
import { ProviderLoader } from '@/providers/ProviderLoader'
import { GoogleTagManager } from '@next/third-parties/google'

ProviderLoader.loadProviders().catch((err) => {
  console.error('Failed to initialize AI providers on startup:', err)
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const siteName = 'ViaFinds'
  const tagline = 'Discovery Defined'
  const metaTitle = `${siteName} | ${tagline}`
  const metaDesc = 'Research-backed articles, guides, and insights on software, AI, and modern digital workflows.'

  return {
    title: {
      default: metaTitle,
      template: `%s | ${siteName}`,
    },
    description: metaDesc,
    metadataBase: new URL('https://viafinds.com'),
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: 'https://viafinds.com',
      siteName: siteName,
      title: metaTitle,
      description: metaDesc,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@viafinds',
      title: metaTitle,
      description: metaDesc,
    },
    verification: {
      other: {
        'impact-site-verification': '01f81daa-2982-441b-a510-97500aa10c86',
      },
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ViaFinds',
    url: 'https://viafinds.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://viafinds.com/logo.png',
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ViaFinds',
    url: 'https://viafinds.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://viafinds.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="bg-background text-on-surface flex flex-col min-h-screen antialiased">
        <PublicFrame settings={null} navigation={null}>
          {children}
        </PublicFrame>

        <GoogleTagManager gtmId="GTM-MX94PFMX" />
        <GoogleAnalytics gaId="G-0J8LV4ZRD6" />
        <ClarityAnalytics />
      </body>
    </html>
  )
}

export const revalidate = 3600
