'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/sanity.client'
import { AUTOCOMPLETE_QUERY } from '@/lib/sanity.queries'

interface SearchBarProps {
  placeholder?: string
  popularSearches?: string[]
}

interface SanityImageRef {
  asset?: { _ref: string; _type: string }
  _type?: string
}

interface AutocompleteResult {
  products: Array<{ _id: string; title: string; slug: string; image?: SanityImageRef }>
  articles: Array<{ _id: string; title: string; slug: string }>
  categories: Array<{ _id: string; name: string; slug: string }>
}

export default function SearchBar({ placeholder = 'Search curated excellence...', popularSearches = [] }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches
  useEffect(() => {
    try {
      const recents = JSON.parse(localStorage.getItem('viafinds_recent_searches') || '[]')
      setRecentSearches(Array.isArray(recents) ? recents.slice(0, 5) : [])
    } catch {
      setRecentSearches([])
    }
  }, [])

  // Close suggestions click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch autocomplete suggestions on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      setSuggestions(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await client.fetch<AutocompleteResult>(AUTOCOMPLETE_QUERY, {
          keyword: `*${trimmed}*`,
        })
        setSuggestions(data)
      } catch (err) {
        console.error('Autocomplete fetch error:', err)
      }
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSearchSubmit = (searchTerm: string) => {
    const term = searchTerm.trim()
    if (!term) return

    // Save to recents
    const nextRecents = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5)
    setRecentSearches(nextRecents)
    localStorage.setItem('viafinds_recent_searches', JSON.stringify(nextRecents))

    setIsOpen(false)
    router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearchSubmit(query)
        }}
        className="w-full bg-white p-2.5 flex items-center gap-2 border border-outline-variant/30 focus-within:border-primary transition-colors"
      >
        <span className="material-symbols-outlined ml-2 text-secondary/60">search</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 border-none focus:ring-0 text-sm font-body outline-none placeholder:text-secondary/40 text-primary py-2.5"
          placeholder={placeholder}
          type="search"
        />
        <button
          type="submit"
          className="bg-primary text-on-primary px-6 py-2.5 font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {/* Autocomplete / Suggestions Overlay */}
      {isOpen && (
        <div className="absolute top-[102%] left-0 w-full bg-white border border-outline-variant/20 shadow-xl z-50 p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
          {/* Quick list of matches */}
          {suggestions && (suggestions.products.length > 0 || suggestions.articles.length > 0 || suggestions.categories.length > 0) ? (
            <div className="flex flex-col gap-4">
              {/* Product matches */}
              {suggestions.products.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-2 block">Products</span>
                  <div className="flex flex-col gap-2">
                    {suggestions.products.map(p => (
                      <button
                        key={p._id}
                        onClick={() => {
                          setIsOpen(false)
                          router.push(`/${p.slug}`)
                        }}
                        className="text-left font-body text-xs text-primary hover:text-gold-accent font-semibold py-1.5 border-b border-surface-container/50 last:border-0 w-full truncate block"
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category matches */}
              {suggestions.categories.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-2 block">Categories</span>
                  <div className="flex flex-col gap-2">
                    {suggestions.categories.map(c => (
                      <button
                        key={c._id}
                        onClick={() => {
                          setIsOpen(false)
                          router.push(`/${c.slug}`)
                        }}
                        className="text-left font-body text-xs text-primary hover:text-gold-accent font-semibold py-1.5 border-b border-surface-container/50 last:border-0 w-full truncate block"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Article matches */}
              {suggestions.articles.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-2 block">Articles & Guides</span>
                  <div className="flex flex-col gap-2">
                    {suggestions.articles.map(a => (
                      <button
                        key={a._id}
                        onClick={() => {
                          setIsOpen(false)
                          router.push(`/articles/${a.slug}`)
                        }}
                        className="text-left font-body text-xs text-primary hover:text-gold-accent font-semibold py-1.5 border-b border-surface-container/50 last:border-0 w-full truncate block"
                      >
                        {a.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="text-center py-4 font-body text-xs text-secondary/60">
              No direct matches found. Press Enter to search.
            </div>
          ) : null}

          {/* Popular Searches */}
          {popularSearches.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-3 block">Popular Searches</span>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchSubmit(term)}
                    className="px-3.5 py-1.5 bg-surface-container text-[11px] font-semibold text-primary hover:bg-gold-accent hover:text-primary transition-all rounded-sm uppercase"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-3 block">Recent Searches</span>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchSubmit(term)}
                    className="px-3.5 py-1.5 bg-surface-container-low text-[11px] font-semibold text-secondary hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1.5 rounded-sm"
                  >
                    <span className="material-symbols-outlined text-[10px]">history</span>
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
