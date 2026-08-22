import React from 'react';

export default function HealthPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-bold text-[36px] leading-[44px] tracking-[-0.02em] text-[#131b2e]">System Health</h1>
          <p className="text-[16px] text-[#444655] mt-1">System connectivity and status checks.</p>
        </div>
      </div>
      <div className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-[48px] text-[#10B981] mb-4">health_and_safety</span>
        <h3 className="text-[20px] font-semibold text-[#131b2e] mb-2">Systems Operational</h3>
        <p className="text-[#444655] max-w-md mx-auto">
          Detailed provider health is monitored by the ProviderRegistry. You can view high-level metrics on the Dashboard Overview.
        </p>
      </div>
    </div>
  );
}
