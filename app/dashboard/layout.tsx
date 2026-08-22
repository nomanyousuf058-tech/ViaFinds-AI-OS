import React from 'react';
import Link from 'next/link';
import '@/app/dashboard/dashboard.css';
import { adminOnly, verifyAdminToken } from '@/lib/auth';
import TopNavBar from './TopNavBar';

export const metadata = {
  title: 'ViaFinds AI OS - System Control',
  description: 'Mission Control Center',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await adminOnly();
  const admin = await verifyAdminToken();
  
  return (
    <div className="bg-[#faf8ff] text-[#131b2e] min-h-screen font-sans flex flex-col md:flex-row antialiased">
      {/* Side Navigation Shell */}
      <nav className="hidden md:flex flex-col h-screen overflow-y-auto px-4 py-6 bg-[#faf8ff] border-r border-[#c5c5d7] w-72 flex-shrink-0 sticky top-0">
        <div className="mb-8 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#2e45d4] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#c5caff]" style={{ fontVariationSettings: "'FILL' 1" }}>memory</span>
          </div>
          <div>
            <div className="font-semibold text-xl text-[#0426be]">ViaFinds AI OS</div>
            <div className="font-semibold text-xs tracking-[0.05em] text-[#444655] uppercase">System Control Center</div>
          </div>
        </div>
        
        <div className="flex-1 space-y-1">
          <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm">Overview</span>
          </Link>
          <Link href="/dashboard/automation" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="text-sm">Automation</span>
          </Link>
          <Link href="/dashboard/products" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="text-sm">Products</span>
          </Link>
          <Link href="/dashboard/discovery" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">trending_up</span>
            <span className="text-sm">Trends</span>
          </Link>
          <Link href="/dashboard/articles" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">article</span>
            <span className="text-sm">Articles</span>
          </Link>
          <Link href="/dashboard/seo" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">search</span>
            <span className="text-sm">SEO</span>
          </Link>
          <Link href="/dashboard/social" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">share</span>
            <span className="text-sm">Social Platforms</span>
          </Link>
          <Link href="/dashboard/affiliate" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">handshake</span>
            <span className="text-sm">Affiliate Partners</span>
          </Link>
          <Link href="/dashboard/partners" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">group</span>
            <span className="text-sm">Partners</span>
          </Link>
          <Link href="/dashboard/connections" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">memory</span>
            <span className="text-sm">AI Providers</span>
          </Link>
          <Link href="/dashboard/queue" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">rule</span>
            <span className="text-sm">Queues</span>
          </Link>
          <Link href="/dashboard/draft-review" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">edit_note</span>
            <span className="text-sm">Draft Review</span>
          </Link>
          <Link href="/dashboard/logs" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm">Logs</span>
          </Link>
          <Link href="/dashboard/settings" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm">Settings</span>
          </Link>
        </div>
        
        {admin && (
          <div className="mt-8 pt-4 border-t border-[#c5c5d7] space-y-1">
            <div className="px-3 py-2 flex flex-col">
              <span className="text-xs text-[#444655]">Admin:</span>
              <span className="text-sm font-medium text-[#131b2e] truncate">{admin.email}</span>
              <form action="/api/auth/logout" method="POST" className="mt-2">
                <button type="submit" className="text-xs font-semibold text-[#ba1a1a] hover:text-[#93000a] transition-colors">
                  LOGOUT
                </button>
              </form>
            </div>
            <Link href="/dashboard/health" className="flex items-center space-x-3 px-3 py-2 rounded text-[#444655] hover:bg-[#e2e7ff] hover:text-[#131b2e] transition-colors duration-150 ease-in-out">
              <span className="material-symbols-outlined">monitor_heart</span>
              <span className="text-sm">System Health</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavBar />
        <main className="flex-1 overflow-y-auto bg-white md:bg-[#ffffff]">
          {children}
        </main>
      </div>
    </div>
  );
}
