'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TopNavBar() {
  const [systemStatus, setSystemStatus] = useState('Idle');
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/automation/status');
        const data = await res.json();
        setSystemStatus(data.status);
      } catch (e) {
        // Ignore error on polling
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRun = async () => {
    await fetch('/api/automation/run', { method: 'POST' });
    setSystemStatus('RUNNING');
  };

  const handleStop = async () => {
    await fetch('/api/automation/stop', { method: 'POST' });
    setSystemStatus('STOPPING');
  };

  return (
    <header className="flex justify-between items-center h-16 px-6 w-full sticky top-0 z-50 bg-[#faf8ff] border-b border-[#c5c5d7]">
      <div className="flex items-center gap-6">
        <div className="md:hidden font-bold text-[#131b2e] flex items-center space-x-2">
          <span className="material-symbols-outlined text-[#0426be]" style={{ fontVariationSettings: "'FILL' 1" }}>memory</span>
          <span>ViaFinds AI OS</span>
        </div>
        
        <div className="hidden md:flex items-center gap-2 text-[#444655] bg-[#f2f3ff] px-3 py-1.5 rounded-lg border border-[#c5c5d7]">
          <span className="material-symbols-outlined text-sm">search</span>
          <span className="font-mono text-sm">Search commands... (⌘K)</span>
        </div>
        
        <nav className="hidden lg:flex gap-6">
          <Link href="/dashboard/health" className="text-sm text-[#444655] hover:text-[#0426be] transition-colors h-16 flex items-center">AI Status</Link>
          <Link href="/dashboard/audit" className="text-sm text-[#444655] hover:text-[#0426be] transition-colors h-16 flex items-center">Sanity Check</Link>
          <Link href="/dashboard/social" className="text-sm text-[#444655] hover:text-[#0426be] transition-colors h-16 flex items-center">Social Sync</Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {systemStatus === 'RUNNING' && (
          <span className="hidden md:flex items-center gap-2 text-xs font-semibold text-[#10B981] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span> RUNNING
          </span>
        )}
        {systemStatus === 'STOPPING' && (
          <span className="hidden md:flex items-center gap-2 text-xs font-semibold text-[#ba1a1a]">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span> STOPPING (SAFE)
          </span>
        )}
        
        <button 
          onClick={handleStop}
          className="border border-[#ba1a1a] text-[#ba1a1a] font-semibold text-xs px-4 py-2 rounded tracking-wider hover:bg-[#ffdad6] transition-colors"
        >
          STOP
        </button>
        <button 
          onClick={handleRun}
          disabled={systemStatus === 'RUNNING'}
          className="bg-[#10B981] text-white font-semibold text-xs px-4 py-2 rounded tracking-wider hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
        >
          RUN
        </button>

        <div className="flex items-center space-x-2 border-l border-[#c5c5d7] pl-4 ml-4">
          <button className="p-2 text-[#444655] hover:text-[#0426be] rounded-full hover:bg-[#eaedff] transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-[#444655] hover:text-[#0426be] rounded-full hover:bg-[#eaedff] transition-colors">
            <span className="material-symbols-outlined">settings_suggest</span>
          </button>
          {/* Mock Admin Profile Image */}
          <div className="w-8 h-8 rounded-full border border-[#c5c5d7] bg-[#e2e7ff] text-[#0426be] flex items-center justify-center ml-2 font-bold text-xs">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
