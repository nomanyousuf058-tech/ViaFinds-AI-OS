'use client' // Error components must be Client Components

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('ViaFinds Global Error Boundary caught an error:', error)
  }, [error])

  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8 relative">
        <span className="material-symbols-outlined text-9xl text-red-500 opacity-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-150" aria-hidden="true">
          warning
        </span>
        <h1 className="font-display text-8xl font-bold text-primary relative z-10">500</h1>
      </div>
      
      <h2 className="font-display text-3xl font-bold text-primary mb-4">Something went wrong.</h2>
      <p className="font-body text-secondary max-w-lg mb-8 leading-relaxed">
        We apologize for the inconvenience. An unexpected error occurred while processing your request. 
        Our team has been notified.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-body font-bold uppercase tracking-widest px-8 py-3 hover:bg-gold-accent transition-colors"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">refresh</span>
          Try Again
        </button>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center gap-2 bg-surface-container text-primary font-body font-bold uppercase tracking-widest px-8 py-3 hover:bg-outline-variant/20 transition-colors"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">home</span>
          Return Home
        </Link>
      </div>
    </main>
  )
}
