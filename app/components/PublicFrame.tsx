'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AnnouncementBar from '@/components/AnnouncementBar'
import type { SiteSettings, Category, Navigation } from '@/lib/types'

interface PublicFrameProps {
  children: React.ReactNode
  categories: Category[]
  settings: SiteSettings | null
  navigation: Navigation | null
}

export default function PublicFrame({ children, categories, settings, navigation }: PublicFrameProps) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard')

  if (isDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <AnnouncementBar data={settings?.announcementBar} />
      <Navbar categories={categories} navigation={navigation} />
      <main className="flex-1 flex flex-col pt-20">
        {children}
      </main>
      <Footer navigation={navigation} settings={settings} />
    </>
  )
}
