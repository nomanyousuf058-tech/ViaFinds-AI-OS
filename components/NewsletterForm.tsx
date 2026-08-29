'use client'

import React, { useState } from 'react'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setStatus('error')
      return
    }

    setStatus('loading')

    // Persist to localStorage as a simple CTA capture
    // (Replace with your actual email service integration, e.g. Mailchimp, ConvertKit, etc.)
    try {
      const existing: string[] = JSON.parse(
        localStorage.getItem('viafinds_newsletter_emails') || '[]'
      )
      if (!existing.includes(trimmed)) {
        existing.push(trimmed)
        localStorage.setItem('viafinds_newsletter_emails', JSON.stringify(existing))
      }
      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 max-w-lg mx-auto py-4">
        <span className="material-symbols-outlined text-gold-accent text-4xl">check_circle</span>
        <p className="font-body text-sm font-bold text-white uppercase tracking-widest">
          You&apos;re on the list.
        </p>
        <p className="font-body text-[10px] text-white/50 uppercase tracking-widest">
          Expect your first ViaFinds digest soon.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto w-full"
      noValidate
    >
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (status === 'error') setStatus('idle')
        }}
        placeholder="Your email address"
        className={`flex-1 bg-white/10 border px-5 py-3.5 font-body text-xs text-white placeholder:text-white/40 focus:outline-none transition-colors ${
          status === 'error' ? 'border-red-400' : 'border-white/20 focus:border-gold-accent'
        }`}
        required
        disabled={status === 'loading'}
        aria-label="Email address for newsletter"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-gold-accent text-primary px-8 py-3.5 font-body text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-60"
      >
        {status === 'loading' ? (
          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
        ) : (
          'Sign Up'
        )}
      </button>
      {status === 'error' && (
        <p className="text-red-400 font-body text-[10px] sm:col-span-2 w-full text-left mt-1">
          Please enter a valid email address.
        </p>
      )}
    </form>
  )
}
