"use client";
// components/TableOfContents.tsx
import { useEffect, useState } from 'react';

export interface SectionItem {
  id: string;
  title: string;
}

/**
 * Table of Contents component
 * - Sticky on desktop (lg and up)
 * - Collapsible accordion on mobile
 * - Highlights active section while scrolling
 */
export default function TableOfContents({ sections }: { sections: SectionItem[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Observe headings to update activeId
  useEffect(() => {
    const headings = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0% -55% 0%', threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  const renderList = (isMobile = false) => (
    <nav aria-label="Table of contents" className={isMobile ? '' : 'sticky top-24'}>
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`block text-sm hover:underline ${activeId === section.id ? 'font-semibold text-primary' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="lg:col-span-1">
      {/* Mobile toggle */}
      <button
        className="lg:hidden mb-2 w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        aria-controls="toc-mobile"
      >
        Table of Contents {mobileOpen ? '▴' : '▾'}
      </button>
      <div id="toc-mobile" className={mobileOpen ? 'block' : 'hidden lg:block'}>
        {renderList(true)}
      </div>
      {/* Desktop version (always visible) */}
      <div className="hidden lg:block max-w-xs">{renderList()}</div>
    </div>
  );
}
