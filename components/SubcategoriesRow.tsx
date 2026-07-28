'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '@/lib/types'
import { urlForSized } from '@/lib/sanity.client'

interface SubcategoriesRowProps {
  subcategories: Category[]
  parentPath: string
}

export default function SubcategoriesRow({ subcategories, parentPath }: SubcategoriesRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      // Provide a tolerance of 2px for precision
      setShowLeftArrow(scrollLeft > 2)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 2)
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      checkScroll()
      el.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScroll)
      }
      window.removeEventListener('resize', checkScroll)
    }
  }, [subcategories])

  // Trigger checkScroll when subcategories list is fully rendered/images loaded
  useEffect(() => {
    const timer = setTimeout(checkScroll, 500)
    return () => clearTimeout(timer)
  }, [subcategories])

  const handleScrollClick = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current
      const scrollAmount = clientWidth * 0.75
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="mb-12 border-b border-surface-container pb-8 relative z-20">
      <span className="font-body text-[10px] font-bold text-secondary uppercase tracking-[0.25em] mb-4 block">
        Sub-spheres
      </span>

      <div className="relative w-full group/row">
        {/* Left Gradient Fade */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-10 hidden md:block" />
        )}

        {/* Left Navigation Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => handleScrollClick('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest/95 shadow-md border border-outline-variant/30 text-primary hover:text-primary-container hover:bg-surface-container hover:border-primary transition-all duration-200"
            aria-label="Scroll left"
          >
            <span className="material-symbols-outlined text-xl font-bold">chevron_left</span>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-1.5 px-0.5 w-full scroll-smooth"
        >
          {subcategories.map((sub) => {
            const hasCoverImage = !!(sub.coverImage || sub.thumbnail)
            const imageUrl = sub.coverImage
              ? urlForSized(sub.coverImage, 96, 96)
              : sub.thumbnail
              ? urlForSized(sub.thumbnail, 96, 96)
              : ''

            return (
              <Link
                key={sub._id}
                href={`${parentPath}/${sub.slug}`}
                className="flex items-center h-12 bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:bg-surface-container-low transition-all shadow-[0_2px_8px_-3px_rgba(0,0,0,0.06)] rounded-[8px] flex-shrink-0 overflow-hidden group/pill select-none pr-4"
              >
                {/* Cover Image/Thumbnail or Icon Placeholder */}
                {hasCoverImage && imageUrl ? (
                  <div className="relative w-12 h-12 flex-shrink-0 bg-surface-container-high border-r border-outline-variant/10 overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={sub.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover/pill:scale-105"
                      priority={false}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex-shrink-0 bg-surface-container flex items-center justify-center border-r border-outline-variant/10">
                    <span className="material-symbols-outlined text-secondary/40 text-lg">
                      {sub.icon || 'folder_open'}
                    </span>
                  </div>
                )}

                {/* Subcategory Details */}
                <span className="pl-3.5 font-body text-[11px] font-bold uppercase tracking-wider text-primary group-hover/pill:text-primary flex items-center gap-1.5 whitespace-nowrap">
                  {sub.name}
                  <span className="text-[9px] text-secondary/50 font-normal">
                    ({sub.productCount || 0})
                  </span>
                </span>
              </Link>
            )
          })}
        </div>

        {/* Right Navigation Arrow */}
        {showRightArrow && (
          <button
            onClick={() => handleScrollClick('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest/95 shadow-md border border-outline-variant/30 text-primary hover:text-primary-container hover:bg-surface-container hover:border-primary transition-all duration-200"
            aria-label="Scroll right"
          >
            <span className="material-symbols-outlined text-xl font-bold">chevron_right</span>
          </button>
        )}

        {/* Right Gradient Fade */}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10 hidden md:block" />
        )}
      </div>
    </div>
  )
}
