'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify')
        if (res.ok) {
          setAuthorized(true)
        } else {
          router.push('/login')
        }
      } catch {
        router.push('/login')
      } finally {
        setChecking(false)
      }
    }
    checkAuth()
  }, [router])

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="font-ui-body text-ui-body text-on-surface-variant">Verifying access...</div>
    </div>
  }

  if (!authorized) return null
  return <>{children}</>
}
