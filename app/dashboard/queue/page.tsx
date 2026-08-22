import React from 'react';
import Link from 'next/link';

export default function QueuePage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-bold text-[36px] leading-[44px] tracking-[-0.02em] text-[#131b2e]">Processing Queue</h1>
          <p className="text-[16px] text-[#444655] mt-1">Monitor the state of items in the automation pipeline.</p>
        </div>
      </div>
      <div className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-[48px] text-[#757686] mb-4">list_alt</span>
        <h3 className="text-[20px] font-semibold text-[#131b2e] mb-2">Queue Dashboard</h3>
        <p className="text-[#444655] max-w-md mx-auto">
          The processing queue displays pending and completed items. You can view overall automation status on the Master Control page.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/automation" className="inline-flex items-center justify-center h-10 px-6 bg-[#0426be] text-white hover:bg-[#031d99] rounded font-semibold tracking-[0.05em] transition-colors">
            GO TO AUTOMATION
          </Link>
        </div>
      </div>
    </div>
  );
}
