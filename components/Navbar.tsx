'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const EDITORIAL_LINKS = [
  { href: '/articles', label: 'Articles' },
  { href: '/search', label: 'Search' },
  { href: '/about', label: 'About' },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background border-b border-slate-border">
        <nav
          className="max-w-max-content-width mx-auto h-16 flex justify-between items-center px-margin-mobile md:px-margin-desktop"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="ViaFinds Home">
              <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tighter text-on-background">
                Viafinds
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-6">
              {EDITORIAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors py-5 whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-5">
            <button
              className="lg:hidden p-1 text-on-surface-variant hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
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

        <div
          id="mobile-menu"
          className={`lg:hidden w-full bg-surface-container-lowest border-b border-slate-border absolute left-0 top-[100%] flex flex-col z-40 overflow-y-auto max-h-[80vh] transition-all duration-300 ${
            mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <nav className="p-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {EDITORIAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 py-3 px-2 font-ui-body text-ui-body font-medium text-on-surface hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}
