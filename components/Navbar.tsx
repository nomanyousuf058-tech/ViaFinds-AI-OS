'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import type { Navigation } from '@/lib/types'

export interface CategoryNode {
  _id: string
  name: string
  slug: string
  parentRef?: string
  parentSlug?: string
  icon?: string
  visibility?: string
}

interface NavbarProps {
  categories: CategoryNode[]
  navigation?: Navigation | null
}

export default function Navbar({ categories, navigation }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [megaMenuOpenId, setMegaMenuOpenId] = useState<string | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [favoritesCount, setFavoritesCount] = useState(0)

  const router = useRouter()
  const pathname = usePathname()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const megaMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setMegaMenuOpenId(null)
    setActiveTabId(null)
  }, [pathname])

  // Favorites count from localStorage
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  const handleMegaEnter = useCallback((id: string) => {
    if (megaMenuTimerRef.current) {
      clearTimeout(megaMenuTimerRef.current)
    }
    setMegaMenuOpenId(id)
    if (id === 'categories-mega') {
      // Default to first category when opening the Categories mega menu
      if (categories.filter(c => !c.parentRef).length > 0 && !activeTabId) {
        setActiveTabId(categories.filter(c => !c.parentRef)[0]._id)
      }
    }
  }, [categories, activeTabId])

  const handleMegaLeave = useCallback(() => {
    megaMenuTimerRef.current = setTimeout(() => {
      setMegaMenuOpenId(null)
    }, 150)
  }, [])

  // Build menu from CMS navigation or fallback to categories
  const rootCategories = categories.filter(c => !c.parentRef && c.visibility !== 'private')
  const getSubcategories = (parentId: string) =>
    categories.filter(c => c.parentRef === parentId)

  // CMS nav items (from Navigation document)
  const cmsMainMenu = navigation?.mainMenu || []
  const cmsMobileMenu = navigation?.mobileMenu || []

  // If CMS nav exists, use it; otherwise auto-generate from categories
  const hasNav = cmsMainMenu.length > 0

  return (
    <>
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 px-margin-mobile md:px-margin-desktop">
        <nav
          className="max-w-container-max mx-auto bg-surface-container-lowest luxury-shadow h-20 flex justify-between items-center px-6 lg:px-8 border border-outline-variant/10 relative"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="ViaFinds Home">
              <span className="material-symbols-outlined text-primary text-3xl font-light" aria-hidden="true">
                auto_awesome
              </span>
              <span className="font-display text-2xl font-bold uppercase tracking-tighter text-primary">
                ViaFinds
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-4 lg:gap-6">
              {hasNav && rootCategories.length === 0 ? (
                // ── CMS-driven nav ──────────────────────────────────────
                cmsMainMenu.map((item, idx) => {
                  const itemId = `cms-nav-${idx}`
                  const hasMega = item.megaMenu && item.megaMenu.length > 0
                  return (
                    <div
                      key={itemId}
                      className="relative"
                      onMouseEnter={() => hasMega && handleMegaEnter(itemId)}
                      onMouseLeave={hasMega ? handleMegaLeave : undefined}
                    >
                      {item.href ? (
                        <Link
                          href={item.href}
                          target={item.openInNewTab ? '_blank' : undefined}
                          rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="font-body text-xs font-semibold text-secondary hover:text-primary transition-colors py-7 uppercase tracking-wider flex items-center gap-1"
                        >
                          {item.icon && (
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">
                              {item.icon}
                            </span>
                          )}
                          {item.label}
                          {item.badge && (
                            <span className="ml-1 px-1.5 py-0.5 bg-gold-accent text-primary text-[9px] font-bold uppercase rounded-full">
                              {item.badge}
                            </span>
                          )}
                          {hasMega && (
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">
                              keyboard_arrow_down
                            </span>
                          )}
                        </Link>
                      ) : (
                        <button
                          className="font-body text-xs font-semibold text-secondary hover:text-primary transition-colors py-7 uppercase tracking-wider flex items-center gap-1"
                          aria-expanded={megaMenuOpenId === itemId}
                          aria-haspopup={hasMega ? 'true' : undefined}
                        >
                          {item.label}
                          {hasMega && (
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">
                              keyboard_arrow_down
                            </span>
                          )}
                        </button>
                      )}

                      {/* CMS Mega Menu */}
                      {hasMega && megaMenuOpenId === itemId && (
                        <div
                          className="absolute top-full left-0 bg-white border border-outline-variant/10 luxury-shadow min-w-[500px] p-8 grid gap-8 z-50 animate-fade-down"
                          style={{ gridTemplateColumns: `repeat(${Math.min(item.megaMenu!.length, 4)}, 1fr)` }}
                          onMouseEnter={() => handleMegaEnter(itemId)}
                          onMouseLeave={handleMegaLeave}
                          role="menu"
                        >
                          {item.megaMenu!.map((col, colIdx) => (
                            <div key={colIdx} className="flex flex-col gap-3">
                              {col.columnTitle && (
                                <span className="font-display text-sm text-primary font-bold border-b border-surface-container pb-2">
                                  {col.columnTitle}
                                </span>
                              )}
                              <ul className="flex flex-col gap-2">
                                {col.links?.map((link, linkIdx) => (
                                  <li key={linkIdx}>
                                    <Link
                                      href={link.href || '#'}
                                      target={link.openInNewTab ? '_blank' : undefined}
                                      className="font-body text-xs text-secondary hover:text-primary transition-colors hover:pl-1 block"
                                      role="menuitem"
                                      onClick={() => setMegaMenuOpenId(null)}
                                    >
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                // ── Auto-generated from categories ──────────────────────
                <>

                  <div
                    className="relative"
                    onMouseEnter={() => handleMegaEnter('categories-mega')}
                    onMouseLeave={handleMegaLeave}
                  >
                    <button
                      className={`font-body text-xs font-semibold py-7 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                        megaMenuOpenId === 'categories-mega' ? 'text-primary' : 'text-secondary hover:text-primary'
                      }`}
                    >
                      Categories
                      <span className="material-symbols-outlined text-sm transition-transform duration-200" style={{ transform: megaMenuOpenId === 'categories-mega' ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden="true">
                        keyboard_arrow_down
                      </span>
                    </button>

                    {megaMenuOpenId === 'categories-mega' && rootCategories.length > 0 && (
                      <div
                        className="absolute top-full left-0 bg-white border border-outline-variant/10 luxury-shadow z-50 animate-fade-down flex w-[820px] max-w-[90vw] h-[65vh] min-h-[420px]"
                        onMouseEnter={() => handleMegaEnter('categories-mega')}
                        onMouseLeave={handleMegaLeave}
                        role="menu"
                      >
                        {/* Left Tab Sidebar */}
                        <div className="w-[220px] shrink-0 bg-surface-container-low border-r border-surface-container flex flex-col py-3 overflow-y-auto">
                          {rootCategories.map(rootCat => (
                            <button
                              key={rootCat._id}
                              onMouseEnter={() => setActiveTabId(rootCat._id)}
                              onClick={() => {
                                setMegaMenuOpenId(null)
                                router.push(`/${rootCat.slug}`)
                              }}
                              className={`flex items-center gap-3 px-5 py-3.5 text-left transition-all ${
                                activeTabId === rootCat._id
                                  ? 'bg-white border-l-2 border-gold-accent text-primary font-bold'
                                  : 'text-secondary hover:bg-white hover:text-primary border-l-2 border-transparent'
                              }`}
                            >
                              <span className="font-body text-xs uppercase tracking-wider">{rootCat.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Right Content Area */}
                        <div className="flex-1 bg-white p-8 overflow-y-auto">
                          {rootCategories.filter(c => c._id === activeTabId).map(activeRoot => {
                            const subCats = getSubcategories(activeRoot._id)
                            const cols = Math.min(3, Math.max(2, Math.ceil(subCats.length / 8)))

                            return (
                              <div key={activeRoot._id}>
                                <div className="flex items-center justify-between pb-3 border-b border-surface-container mb-6">
                                  <span className="font-display text-lg font-bold text-primary">
                                    {activeRoot.name}
                                  </span>
                                  <Link
                                    href={`/${activeRoot.slug}`}
                                    className="font-body text-[10px] font-bold text-gold-accent hover:underline uppercase tracking-widest"
                                    onClick={() => setMegaMenuOpenId(null)}
                                  >
                                    View All →
                                  </Link>
                                </div>

                                {subCats.length > 0 ? (
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))`,
                                      gap: '0.75rem 2rem',
                                    }}
                                  >
                                    {subCats.map(sub => (
                                      <Link
                                        key={sub._id}
                                        href={`/${activeRoot.slug}/${sub.slug}`}
                                        className={`font-body text-xs hover:text-primary transition-colors hover:pl-1 block py-1.5 ${
                                          pathname === `/${activeRoot.slug}/${sub.slug}` ? 'text-primary font-bold border-l-2 border-gold-accent pl-2' : 'text-secondary'
                                        }`}
                                        onClick={() => setMegaMenuOpenId(null)}
                                      >
                                        {sub.name}
                                      </Link>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-secondary text-sm font-body">No subcategories yet.</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link href="/search?type=brand" className="font-body text-xs font-semibold text-secondary hover:text-primary transition-colors py-7 uppercase tracking-wider whitespace-nowrap">
                    Brands
                  </Link>
                  <Link href="/search?featured=true" className="font-body text-xs font-semibold text-secondary hover:text-primary transition-colors py-7 uppercase tracking-wider whitespace-nowrap">
                    Deals
                  </Link>
                  <Link href="/toolkit" className="font-body text-xs font-semibold text-secondary hover:text-primary transition-colors py-7 uppercase tracking-wider whitespace-nowrap">
                    Toolkit
                  </Link>
                </>

              )}
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-4 lg:gap-5">
            {/* Desktop search */}
            <form onSubmit={handleSearchSubmit} className="relative group hidden sm:block" role="search">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none group-focus-within:text-primary transition-colors text-[18px]" aria-hidden="true">
                search
              </span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-surface-container border-none focus:ring-1 focus:ring-primary/40 w-52 font-body text-xs transition-all duration-300 focus:w-72 outline-none text-primary placeholder:text-secondary/50"
                placeholder="Search ViaFinds..."
                type="search"
                aria-label="Search ViaFinds"
              />
            </form>

            {/* Favorites */}
            <button
              onClick={() => router.push('/search?favorites=true')}
              className="relative p-1 text-secondary hover:text-primary transition-colors"
              title={`Favorites${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`}
              aria-label={`Favorites${favoritesCount > 0 ? `, ${favoritesCount} items` : ''}`}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                favorite
              </span>
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gold-accent text-primary text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white" aria-hidden="true">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </button>

            {/* Account */}
            <button
              className="p-1 text-secondary hover:text-primary transition-colors hidden sm:block"
              title="Account"
              aria-label="Account"
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                account_circle
              </span>
            </button>

            {/* Mobile hamburger — FIXED: uses proper click handler */}
            <button
              className="lg:hidden p-1 text-primary hover:text-gold-accent transition-colors"
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

        {/* ── Mobile Menu Drawer ──────────────────────────────────────── */}
        <div
          id="mobile-menu"
          className={`lg:hidden w-full bg-white border-t border-outline-variant/10 luxury-shadow absolute left-0 top-[100%] flex flex-col gap-0 z-40 overflow-y-auto max-h-[80vh] transition-all duration-300 ${
            mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          {/* Mobile search */}
          <form onSubmit={handleSearchSubmit} className="p-4 border-b border-surface-container" role="search">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]" aria-hidden="true">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container border-none outline-none font-body text-xs"
                placeholder="Search ViaFinds..."
                type="search"
                aria-label="Mobile search"
              />
            </div>
          </form>

          <nav className="p-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {/* CMS mobile menu or auto-generated */}
            {(cmsMobileMenu.length > 0 ? cmsMobileMenu : [
              {
                label: 'Categories',
                children: rootCategories.map(cat => ({
                  label: cat.name,
                  icon: cat.icon,
                  children: [
                    { label: `View All ${cat.name}`, href: `/${cat.slug}` },
                    ...getSubcategories(cat._id).map(sub => ({
                      label: sub.name,
                      href: `/${cat.slug}/${sub.slug}`,
                    }))
                  ],
                })),
              },
              { label: 'Brands', href: '/search?type=brand' },
              { label: 'Deals', href: '/search?featured=true' },
              { label: 'Toolkit', href: '/toolkit' },
            ]).map((item, idx) => (
              <MobileMenuItem key={idx} item={item} onClose={() => setMobileMenuOpen(false)} />
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}

// ── Mobile Menu Item ──────────────────────────────────────────────────────────

interface MobileMenuItemProps {
  item: {
    label: string
    href?: string
    icon?: string
    children?: { label: string; href?: string }[]
  }
  onClose: () => void
  depth?: number
}

function MobileMenuItem({ item, onClose, depth = 0 }: MobileMenuItemProps) {
  const [open, setOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  return (
    <div className={`border-b border-surface-container last:border-0 ${depth > 0 ? 'border-none mt-1' : ''}`}>
      <div className="flex items-center justify-between">
        {item.href && !hasChildren ? (
          <Link
            href={item.href}
            className={`flex items-center gap-2 py-3 px-2 font-body text-sm font-semibold text-primary hover:text-gold-accent transition-colors flex-1 uppercase tracking-wide ${depth > 0 ? 'text-xs text-secondary normal-case tracking-normal py-2' : ''}`}
            onClick={onClose}
          >
            {item.icon && (
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label}
          </Link>
        ) : (
          <button
            className={`flex items-center gap-2 py-3 px-2 font-body text-sm font-semibold text-primary flex-1 text-left uppercase tracking-wide ${depth > 0 ? 'text-xs text-secondary py-2' : ''}`}
            onClick={() => setOpen(prev => !prev)}
          >
            {item.icon && (
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        )}
        {hasChildren && (
          <button
            onClick={() => setOpen(prev => !prev)}
            className="p-2 text-secondary hover:text-primary"
            aria-expanded={open}
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          >
            <span className="material-symbols-outlined text-base transition-transform duration-200" style={{ display: 'block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden="true">
              keyboard_arrow_down
            </span>
          </button>
        )}
      </div>

      {hasChildren && open && (
        <div className={`pb-2 pl-4 flex flex-col gap-0.5 animate-fade-down origin-top overflow-hidden ${depth > 0 ? 'border-l-2 border-surface-container ml-2' : ''}`}>
          {item.children!.map((child, idx) => (
            <MobileMenuItem key={idx} item={child} onClose={onClose} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
