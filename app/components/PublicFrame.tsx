'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AnnouncementBar from '@/components/AnnouncementBar'
import type { SiteSettings, Navigation } from '@/lib/types'

interface PublicFrameProps {
  children: React.ReactNode
  settings: SiteSettings | null
  navigation: Navigation | null
}

export default function PublicFrame({ children, settings, navigation }: PublicFrameProps) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard')

  if (isDashboard) {
    return <>{children}</>
  }

  return (
    <>
      <AnnouncementBar data={settings?.announcementBar} />
      <Navbar />
      <main className="flex-1 flex flex-col pt-20">
        {children}
      </main>
      <Footer navigation={navigation} settings={settings} />
    </>
  )
}
