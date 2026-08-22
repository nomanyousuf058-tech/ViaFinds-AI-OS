import React from 'react';
import Link from 'next/link';

export default function AffiliatePage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-bold text-[36px] leading-[44px] tracking-[-0.02em] text-[#131b2e]">Affiliate Partners</h1>
          <p className="text-[16px] text-[#444655] mt-1">Manage affiliate network integrations and products.</p>
        </div>
      </div>
      <div className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-[48px] text-[#757686] mb-4">storefront</span>
        <h3 className="text-[20px] font-semibold text-[#131b2e] mb-2">Partner Integrations</h3>
        <p className="text-[#444655] max-w-md mx-auto">
          Configure API connections for Digistore24, Amazon, and other partners in the Connections Center.
        </p>
        <div className="mt-6">
          <Link href="/dashboard/connections" className="inline-flex items-center justify-center h-10 px-6 bg-[#0426be] text-white hover:bg-[#031d99] rounded font-semibold tracking-[0.05em] transition-colors">
            GO TO CONNECTIONS
          </Link>
        </div>
      </div>
    </div>
  );
}
