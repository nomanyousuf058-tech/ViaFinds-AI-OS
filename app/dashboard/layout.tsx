import React from 'react';
import Link from 'next/link';
import '@/app/dashboard/dashboard.css';

export const metadata = {
  title: 'Human Review Dashboard',
  description: 'Review and approve content before publishing',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <h2 className="sidebar-title">Review Dashboard</h2>
        <nav className="sidebar-nav">
          <ul>
            <li><Link href="/dashboard">Home</Link></li>
            <li><Link href="/dashboard/draft-queue">Draft Queue</Link></li>
            <li><Link href="/dashboard/product-review">Product Review</Link></li>
            <li><Link href="/dashboard/article-review">Article Review</Link></li>
            <li><Link href="/dashboard/category-review">Category Review</Link></li>
            <li><Link href="/dashboard/search-intelligence-review">Search Intelligence Review</Link></li>
            <li><Link href="/dashboard/image-prompt-review">Image Prompt Review</Link></li>
            <li><Link href="/dashboard/quality-review">Quality Review</Link></li>
            <li><Link href="/dashboard/publish-queue">Publish Queue</Link></li>
            <li><Link href="/dashboard/activity-log">Activity Log</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}

