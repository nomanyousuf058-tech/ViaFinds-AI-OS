'use client'

import React, { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Product } from '@/lib/types'

interface CategoryFiltersProps {
  products: Product[]
}

export default function CategoryFilters({ products }: CategoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. Get unique values of existing attributes in currently shown products
  const filterOptions = useMemo(() => {
    const brands = new Set<string>()
    const manufacturers = new Set<string>()
    const scales = new Set<string>()
    const materials = new Set<string>()
    const availabilities = new Set<string>()

    products.forEach((p) => {
      if (p.brand?.name) brands.add(p.brand.name)
      if (p.manufacturer?.name) manufacturers.add(p.manufacturer.name)
      if (p.availability) availabilities.add(p.availability)
      p.specifications?.forEach((spec) => {
        const k = spec.key.toLowerCase()
        if (k === 'scale') scales.add(spec.value)
        if (k === 'material') materials.add(spec.value)
      })
    })

    return {
      brands: Array.from(brands).sort(),
      manufacturers: Array.from(manufacturers).sort(),
      scales: Array.from(scales).sort(),
      materials: Array.from(materials).sort(),
      availabilities: Array.from(availabilities).sort(),
    }
  }, [products])

  // Get active query param sets
  const activeBrands = useMemo(() => new Set(searchParams.getAll('brand')), [searchParams])
  const activeScales = useMemo(() => new Set(searchParams.getAll('scale')), [searchParams])
  const activeMaterials = useMemo(() => new Set(searchParams.getAll('material')), [searchParams])
  const activeAvailability = useMemo(() => new Set(searchParams.getAll('availability')), [searchParams])
  const activeRating = searchParams.get('rating') || ''
  const activeSort = searchParams.get('sort') || 'newest'

  // Handle updates
  const setFilter = (key: string, value: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (checked) {
      params.append(key, value)
    } else {
      const values = params.getAll(key).filter(v => v !== value)
      params.delete(key)
      values.forEach(v => params.append(key, v))
    }
    
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const setSingleParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const clearAllFilters = () => {
    router.push(window.location.pathname, { scroll: false })
  }

  const hasActiveFilters = searchParams.toString().length > 0

  return (
    <aside className="w-full lg:w-64 flex flex-col gap-8 shrink-0 bg-white border border-outline-variant/10 p-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-surface-container">
        <h2 className="font-display text-base font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-base">tune</span>
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-bold text-gold-accent hover:underline uppercase tracking-wider"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-2.5">
        <label htmlFor="sort-by" className="font-body text-[10px] font-bold text-secondary uppercase tracking-wider">
          Sort By
        </label>
        <select
          id="sort-by"
          value={activeSort}
          onChange={(e) => setSingleParam('sort', e.target.value)}
          className="w-full bg-surface-container border border-outline-variant/20 p-2.5 font-body text-xs font-semibold text-primary outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="title-asc">Title: A-Z</option>
        </select>
      </div>

      {/* Brands Filter */}
      {filterOptions.brands.length > 0 && (
        <FilterSection title="Brands">
          {filterOptions.brands.map((brand) => (
            <CheckboxRow
              key={brand}
              id={`brand-${brand}`}
              label={brand}
              checked={activeBrands.has(brand)}
              onChange={(e) => setFilter('brand', brand, e.target.checked)}
            />
          ))}
        </FilterSection>
      )}

      {/* Availability */}
      {filterOptions.availabilities.length > 0 && (
        <FilterSection title="Availability">
          {filterOptions.availabilities.map((avail) => (
            <CheckboxRow
              key={avail}
              id={`avail-${avail}`}
              label={avail.replace('_', ' ')}
              checked={activeAvailability.has(avail)}
              onChange={(e) => setFilter('availability', avail, e.target.checked)}
            />
          ))}
        </FilterSection>
      )}

      {/* Scales */}
      {filterOptions.scales.length > 0 && (
        <FilterSection title="Scale">
          {filterOptions.scales.map((scale) => (
            <CheckboxRow
              key={scale}
              id={`scale-${scale}`}
              label={scale}
              checked={activeScales.has(scale)}
              onChange={(e) => setFilter('scale', scale, e.target.checked)}
            />
          ))}
        </FilterSection>
      )}

      {/* Materials */}
      {filterOptions.materials.length > 0 && (
        <FilterSection title="Material">
          {filterOptions.materials.map((mat) => (
            <CheckboxRow
              key={mat}
              id={`mat-${mat}`}
              label={mat}
              checked={activeMaterials.has(mat)}
              onChange={(e) => setFilter('material', mat, e.target.checked)}
            />
          ))}
        </FilterSection>
      )}

      {/* Ratings */}
      <FilterSection title="Minimum Rating">
        {[4, 3, 2].map((r) => (
          <label key={r} className="flex items-center gap-3 font-body text-xs text-secondary cursor-pointer select-none">
            <input
              type="radio"
              name="rating-filter"
              checked={activeRating === String(r)}
              onChange={(e) => setSingleParam('rating', e.target.checked ? String(r) : '')}
              className="text-primary focus:ring-0"
            />
            <span className="flex items-center gap-1">
              {r}+ Stars
              <span className="material-symbols-outlined text-gold-accent text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
            </span>
          </label>
        ))}
      </FilterSection>
    </aside>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-surface-container pt-4">
      <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-widest">
        {title}
      </span>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
        {children}
      </div>
    </div>
  )
}

function CheckboxRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 font-body text-xs text-secondary cursor-pointer select-none hover:text-primary transition-colors">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-outline-variant/40 text-primary focus:ring-0 focus:ring-offset-0"
      />
      <span className="capitalize">{label}</span>
    </label>
  )
}
