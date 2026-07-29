'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import type { AnnouncementBar as AnnouncementBarType } from '@/lib/types'

interface AnnouncementBarProps {
  data?: AnnouncementBarType | null
}

export default function AnnouncementBar({ data }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const dismissed = sessionStorage.getItem('announcement-dismissed')
    if (dismissed === 'true') {
      setIsVisible(false)
    }
  }, [])



  // Default fallback when CMS hasn't been configured yet
  const enabled = data?.enabled !== false
  
  if (!enabled || !isVisible || !isClient) return null

  const text = data?.text || 'Welcome to ViaFinds — Expertly Curated Finds'
  const linkLabel = data?.linkLabel
  const linkHref = data?.linkHref
  const bgColor = data?.bgColor || '#00113a'

  return (
    <div
      className="relative py-2.5 px-4 text-center select-none border-b border-white/5 z-50 flex items-center justify-center animate-fade-down"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full max-w-container-max mx-auto flex justify-center items-center">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] m-0 text-white">
          {text}
          {linkLabel && linkHref && (
            <>
              <span className="hidden sm:inline">{' — '}</span>
              <span className="sm:hidden">{' '}</span>
              <Link
                href={linkHref}
                className="underline hover:opacity-80 transition-opacity text-white"
              >
                {linkLabel}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
