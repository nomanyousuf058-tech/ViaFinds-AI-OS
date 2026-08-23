'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-viafinds-border bg-viafinds-bg/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-xl font-bold text-viafinds-text tracking-tight">
            Viafinds
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/reviews" className="text-sm text-viafinds-muted hover:text-viafinds-text transition-colors">
              Reviews
            </Link>
            <Link href="/admin" className="text-sm text-viafinds-muted hover:text-viafinds-text transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
