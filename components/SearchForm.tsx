'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 mb-10 max-w-2xl">
      <div className="relative flex-1">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, guides, or insights..."
          className="w-full bg-surface-container border border-outline/30 text-on-background px-12 py-4 rounded font-ui-body text-ui-body focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-deep-navy px-8 py-4 rounded font-ui-label text-ui-label font-bold hover:bg-primary-hover transition-colors"
      >
        Search
      </button>
    </form>
  );
}
