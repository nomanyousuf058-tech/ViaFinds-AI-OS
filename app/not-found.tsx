import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | ViaFinds',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return (
    <main className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8 relative">
        <span className="material-symbols-outlined text-9xl text-gold-accent opacity-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-150" aria-hidden="true">
          explore_off
        </span>
        <h1 className="font-display text-8xl font-bold text-primary relative z-10">404</h1>
      </div>
      
      <h2 className="font-display text-3xl font-bold text-primary mb-4">We lost the trail.</h2>
      <p className="font-body text-secondary max-w-lg mb-8 leading-relaxed">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. 
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <Link 
          href="/" 
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-body font-bold uppercase tracking-widest px-8 py-3 hover:bg-gold-accent transition-colors"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">home</span>
          Return Home
        </Link>
        <Link 
          href="/search" 
          className="inline-flex items-center justify-center gap-2 bg-surface-container text-primary font-body font-bold uppercase tracking-widest px-8 py-3 hover:bg-outline-variant/20 transition-colors"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">search</span>
          Search ViaFinds
        </Link>
      </div>

      <div className="w-full max-w-2xl text-left border-t border-surface-container pt-8">
        <h3 className="font-display text-xl font-bold text-primary mb-4 text-center">Popular Categories</h3>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/technology" className="font-body text-sm font-bold text-secondary hover:text-gold-accent uppercase tracking-wider">Technology</Link>
          <Link href="/home" className="font-body text-sm font-bold text-secondary hover:text-gold-accent uppercase tracking-wider">Home</Link>
          <Link href="/lifestyle" className="font-body text-sm font-bold text-secondary hover:text-gold-accent uppercase tracking-wider">Lifestyle</Link>
          <Link href="/collectibles" className="font-body text-sm font-bold text-secondary hover:text-gold-accent uppercase tracking-wider">Collectibles</Link>
        </div>
      </div>
    </main>
  );
}
