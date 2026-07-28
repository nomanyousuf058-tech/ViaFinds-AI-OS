import React from 'react'
import Link from 'next/link'

export interface BreadcrumbItem {
  name: string
  slug: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Generate structured data schema for breadcrumbs
  const schemaListItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://viafinds.com',
    },
    ...items.map((item, index) => {
      // Build proper href path
      const pathSegments = items.slice(0, index + 1).map(i => {
        // If slug already has slashes (e.g. "collectibles/diecast"), clean it
        return i.slug.startsWith('/') ? i.slug.slice(1) : i.slug
      })
      // Flatten arrays and split by slash just in case
      const flatSegments = pathSegments.join('/').split('/').filter(Boolean)
      const href = '/' + flatSegments.join('/')

      return {
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: `https://viafinds.com${href}`,
      }
    }),
  ]

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: schemaListItems,
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav className="flex items-center flex-wrap gap-2 text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-8 select-none">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1
          
          // Build absolute relative href
          const pathSegments = items.slice(0, index + 1).map(i => {
            return i.slug.startsWith('/') ? i.slug.slice(1) : i.slug
          })
          const flatSegments = pathSegments.join('/').split('/').filter(Boolean)
          const href = '/' + flatSegments.join('/')

          return (
            <React.Fragment key={index}>
              <span className="text-secondary/40 select-none">/</span>
              {isLast ? (
                <span className="text-gold-accent font-extrabold truncate max-w-[200px]" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={href} className="hover:text-primary transition-colors">
                  {item.name}
                </Link>
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </>
  )
}
