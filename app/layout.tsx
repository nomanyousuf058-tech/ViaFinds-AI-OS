import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AnnouncementBar from '@/components/AnnouncementBar'
import { GoogleAnalytics } from '@next/third-parties/google'
import ClarityAnalytics from '@/components/Clarity'
import { client } from '@/lib/sanity.client'
import { ALL_CATEGORIES_QUERY, SITE_SETTINGS_QUERY, NAVIGATION_QUERY } from '@/lib/sanity.queries'
import type { SiteSettings, Navigation, Category } from '@/lib/types'

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

// Generate dynamic site-wide metadata using Site Settings from Sanity
export async function generateMetadata(): Promise<Metadata> {
  let settings: SiteSettings | null = null
  try {
    settings = await client.fetch<SiteSettings>(SITE_SETTINGS_QUERY)
  } catch {
    // Fail silently
  }

  const siteName = settings?.siteName || 'ViaFinds'
  const tagline = settings?.tagline || 'Discovery Defined'
  const metaTitle = settings?.defaultSeo?.metaTitle || `${siteName} | ${tagline}`
  const metaDesc = settings?.defaultSeo?.metaDescription || 'Expertly curated software, collectibles, and luxury essentials.'

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
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let categories: Category[] = []
  let settings: SiteSettings | null = null
  let navigation: Navigation | null = null

  try {
    const [catsRes, settingsRes, navRes] = await Promise.all([
      client.fetch(ALL_CATEGORIES_QUERY),
      client.fetch(SITE_SETTINGS_QUERY),
      client.fetch(NAVIGATION_QUERY),
    ])
    categories = catsRes || []
    settings = settingsRes
    navigation = navRes
  } catch (err) {
    console.error('Failed to load global layouts data from Sanity:', err)
  }

  // JSON-LD: Organization
  const socialLinks = [
    settings?.socialLinks?.twitter,
    settings?.socialLinks?.instagram,
    settings?.socialLinks?.youtube,
    settings?.socialLinks?.tiktok,
  ].filter((v): v is string => Boolean(v))

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings?.siteName || 'ViaFinds',
    url: 'https://viafinds.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://viafinds.com/logo.png',
    },
    ...(socialLinks.length > 0 && { sameAs: socialLinks }),
  }

  // JSON-LD: WebSite (enables Sitelinks Search Box in Google)
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings?.siteName || 'ViaFinds',
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
        <meta name="impact-site-verification" value="01f81daa-2982-441b-a510-97500aa10c86" />
        {/* Google Tag Manager — must be first in <head> */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MX94PFMX');`,
          }}
        />
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
        {/* Google Tag Manager (noscript) — must be first in <body> */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MX94PFMX"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        <AnnouncementBar data={settings?.announcementBar} />
        
        {/* Dynamic header / Navbar component */}
        <Navbar categories={categories} navigation={navigation} />
        
        {/* pt-20 is for Navbar height since it is fixed */}
        <main className="flex-1 flex flex-col pt-20">
          {children}
        </main>
        
        <Footer navigation={navigation} settings={settings} />
      </body>
      <GoogleAnalytics gaId="G-0J8LV4ZRD6" />
      <ClarityAnalytics />
    </html>
  )
}
export const revalidate = 3600 // ISR: Revalidate pages every hour
