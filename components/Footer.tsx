'use client'

import React from 'react'
import Link from 'next/link'
import type { Navigation, SiteSettings, FooterColumn, NavLink } from '@/lib/types'

interface FooterProps {
  navigation?: Navigation | null
  settings?: SiteSettings | null
}

export default function Footer({ navigation, settings }: FooterProps) {
  const year = new Date().getFullYear()
  const siteName = settings?.siteName || 'ViaFinds'
  const tagline = settings?.tagline || 'Discovery Defined.'
  const socialLinks = settings?.socialLinks

  const footerColumns = (navigation?.footerColumns || DEFAULT_FOOTER_COLUMNS) as FooterColumn[]
  const legalLinks = (navigation?.legalLinks || DEFAULT_LEGAL_LINKS) as NavLink[]

  return (
    <footer className="bg-primary text-on-primary border-t border-white/5 mt-auto">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="md:col-span-3 lg:col-span-2 flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-3" aria-label={`${siteName} Home`}>
              <span className="material-symbols-outlined text-gold-accent text-3xl font-light" aria-hidden="true">
                auto_awesome
              </span>
              <span className="font-display text-2xl font-bold uppercase tracking-tighter text-white">
                {siteName}
              </span>
            </Link>
            <p className="font-body text-xs text-white/60 leading-relaxed max-w-xs">
              {tagline} Expertly curated products, software, collectibles, and luxury essentials for those who value precision over noise.
            </p>

            {/* Social Links */}
            {socialLinks && (
              <div className="flex items-center gap-4">
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-gold-accent transition-colors" aria-label="Twitter / X">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">flutter_dash</span>
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-gold-accent transition-colors" aria-label="Instagram">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">photo_camera</span>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-gold-accent transition-colors" aria-label="YouTube">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">play_circle</span>
                  </a>
                )}
                {socialLinks.pinterest && (
                  <a href={socialLinks.pinterest} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-gold-accent transition-colors" aria-label="Pinterest">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">interests</span>
                  </a>
                )}
              </div>
            )}

            {settings?.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="font-body text-[10px] text-white/40 hover:text-gold-accent transition-colors uppercase tracking-widest"
              >
                {settings.contactEmail}
              </a>
            )}
          </div>

          {/* Navigation columns */}
          {footerColumns.map((column, idx) => (
            <div key={idx} className="flex flex-col gap-4">
              {column.heading && (
                <span className="font-body text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
                  {column.heading}
                </span>
              )}
              <ul className="flex flex-col gap-3">
                {column.links?.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link
                      href={link.href || '#'}
                      target={link.openInNewTab ? '_blank' : undefined}
                      rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                      className="font-body text-xs text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-6">
          <p className="font-body text-[10px] text-white/30 uppercase tracking-widest">
            © {year} {siteName}. All rights reserved. Affiliate links may earn us a commission.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <nav className="flex items-center gap-6" aria-label="Legal">
              {legalLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href || '#'}
                  className="font-body text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="font-body text-[10px] text-gold-accent hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1 sm:ml-4"
              aria-label="Back to top"
            >
              Back To Top
              <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Fallback defaults (used when Navigation document is not yet created in CMS)
const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Discover',
    links: [
      { label: 'All Products', href: '/search' },
      { label: 'Trending', href: '/search?trending=true' },
      { label: "Editor's Picks", href: '/search?editor=true' },
      { label: 'New Arrivals', href: '/search?newest=true' },
      { label: 'Deals', href: '/search?featured=true' },
    ],
  },
  {
    heading: 'Editorial',
    links: [
      { label: 'Articles', href: '/articles' },
      { label: 'Reviews', href: '/reviews' },
      { label: 'Brands', href: '/search?type=brand' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
]

const DEFAULT_LEGAL_LINKS: NavLink[] = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
]
