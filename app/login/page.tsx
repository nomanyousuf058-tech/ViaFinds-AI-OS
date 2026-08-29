'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-ui-body">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-on-background">ViaFinds AI OS</h1>
          <p className="mt-2 text-on-surface-variant">Admin Dashboard</p>
        </div>

        <div className="bg-surface-container border border-slate-border shadow sm:rounded-lg p-8">
          <h2 className="text-xl font-semibold text-on-background mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-background border border-slate-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-on-background"
                placeholder="admin@viafinds.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-on-surface">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-background border border-slate-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-on-background"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-inverse-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-on-surface-variant hover:text-on-background">
              Return to website
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-on-surface-variant">
          Protected by ViaFinds AI OS Admin Authentication
        </p>
      </div>
    </div>
  );
}