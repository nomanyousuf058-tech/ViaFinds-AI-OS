'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Navigation } from '@/lib/types'

interface NavbarProps {
  navigation?: Navigation | null
}

export default function Navbar({ navigation }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const update = () => {
      try {
        const favs = JSON.parse(localStorage.getItem('viafinds_favorites') || '[]')
        setFavoritesCount(Array.isArray(favs) ? favs.length : 0)
      } catch {
        setFavoritesCount(0)
      }
    }
    update()
    window.addEventListener('storage', update)
    window.addEventListener('favorites-updated', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('favorites-updated', update)
    }
  }, [])

  const cmsMainMenu = navigation?.mainMenu || []
  const hasNav = cmsMainMenu.length > 0

  const editorialLinks: { href: string; label: string; icon?: string }[] = [
    { href: '/articles', label: 'Articles' },
    { href: '/search', label: 'Search' },
    { href: '/about', label: 'About' },
  ]

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background border-b border-slate-border">
        <nav
          className="max-w-max-content-width mx-auto h-16 flex justify-between items-center px-margin-mobile md:px-margin-desktop"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="ViaFinds Home">
              <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tighter text-on-background">
                Viafinds
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-6">
              {hasNav ? (
                cmsMainMenu.map((item, idx) => {
                  const itemId = `cms-nav-${idx}`
                  const hasMega = item.megaMenu && item.megaMenu.length > 0
                  if (hasMega) return null
                  return (
                    <div key={itemId} className="relative">
                      {item.href ? (
                        <Link
                          href={item.href}
                          target={item.openInNewTab ? '_blank' : undefined}
                          rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors py-5 flex items-center gap-1"
                        >
                          {item.icon && (
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                              {item.icon}
                            </span>
                          )}
                          {item.label}
                        </Link>
                      ) : (
                        <span className="font-label-caps text-label-caps text-on-surface-variant py-5 flex items-center gap-1">
                          {item.label}
                        </span>
                      )}
                    </div>
                  )
                })
              ) : (
                editorialLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors py-5 whitespace-nowrap"
                  >
                    {link.label}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-4 lg:gap-5">
            <form onSubmit={(e) => {}} className="relative group hidden sm:block" role="search">
              <Link href="/search" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  search
                </span>
                <span className="text-sm font-ui-body">Search</span>
              </Link>
            </form>

            <Link
              href="/search?favorites=true"
              className="relative p-1 text-on-surface-variant hover:text-primary transition-colors"
              title={`Favorites${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`}
              aria-label={`Favorites${favoritesCount > 0 ? `, ${favoritesCount} items` : ''}`}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                favorite
              </span>
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-deep-navy text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center" aria-hidden="true">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
               )}
             </Link>

             <button
              className="lg:hidden p-1 text-on-surface-variant hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>

        {/* Mobile Menu Drawer */}
        <div
          id="mobile-menu"
          className={`lg:hidden w-full bg-surface-container-lowest border-b border-slate-border absolute left-0 top-[100%] flex flex-col z-40 overflow-y-auto max-h-[80vh] transition-all duration-300 ${
            mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <nav className="p-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {(() => {
              if (cmsMainMenu.length > 0) {
                const filtered = cmsMainMenu.filter(item => !item.megaMenu || item.megaMenu.length === 0)
                return filtered.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href || '#'}
                    className="flex items-center gap-2 py-3 px-2 font-ui-body text-ui-body font-medium text-on-surface hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon && (
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </Link>
                ))
              }
              return editorialLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="flex items-center gap-2 py-3 px-2 font-ui-body text-ui-body font-medium text-on-surface hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon && (
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      {link.icon}
                    </span>
                  )}
                  {link.label}
                </Link>
              ))
            })()}
            <Link href="/search" className="flex items-center gap-2 py-3 px-2 font-ui-body text-ui-body font-medium text-on-surface hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
              <span className="material-symbols-outlined text-base" aria-hidden="true">search</span>
              Search
            </Link>
          </nav>
        </div>
      </header>
    </>
  )
}
