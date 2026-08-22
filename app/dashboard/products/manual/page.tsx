'use client';

import React, { useState } from 'react';

export default function ProcessProductPage() {
  const [url, setUrl] = useState('');
  const [systemStatus, setSystemStatus] = useState('Idle');
  
  const handleProcess = async () => {
    if (!url) return;
    setSystemStatus('RUNNING');
    
    // In a real implementation, this would post the URL to an endpoint
    // to add it to the ProductIntelligence workflow queue.
    try {
      await fetch('/api/automation/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MANUAL_PRODUCT',
          url,
        })
      });
      // Mocking immediate processing feedback
      setTimeout(() => setSystemStatus('COMPLETED'), 2000);
    } catch (e) {
      setSystemStatus('FAILED');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-1 mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-[36px] leading-[44px] tracking-[-0.02em] font-bold text-[#131b2e]">Process Product</h2>
          <span className="px-2.5 py-1 rounded bg-[#e2e7ff] text-[#0426be] font-mono text-[13px] font-medium border border-[#c5c5d7] flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${systemStatus === 'RUNNING' ? 'bg-[#10B981] animate-pulse' : 'bg-[#0426be]'}`}></span>
            {systemStatus.toUpperCase()}
          </span>
        </div>
        <p className="text-[16px] text-[#444655] max-w-2xl mt-1">Manually extract intelligence and categorize a specific product by URL or ASIN.</p>
      </div>

      <div className="bg-white border border-[#c5c5d7] rounded-xl flex flex-col relative overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#c5c5d7] bg-[#faf8ff] flex justify-between items-center">
          <div>
            <h3 className="text-[20px] font-semibold text-[#131b2e]">Target Configuration</h3>
            <p className="text-[14px] text-[#444655] mt-1">Enter the target product details to begin extraction.</p>
          </div>
          <span className="font-mono text-[13px] font-medium text-[#757686] bg-white px-2 py-1 rounded border border-[#c5c5d7]">MANUAL-PROC-01</span>
        </div>
        
        <div className="p-6 bg-white space-y-6">
          <div>
            <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#131b2e] uppercase mb-2">Product URL or ID</label>
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-3 text-[#757686] text-[20px]">link</span>
              <input 
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#c5c5d7] rounded-lg text-[14px] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-[#006a61] transition-shadow shadow-sm" 
                placeholder="https://amazon.com/dp/B08XYZ... or ASIN" 
                type="text" 
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-[#c5c5d7] border-dashed">
            <div className="md:col-span-2 mb-2">
               <h4 className="text-[12px] font-semibold tracking-[0.05em] text-[#757686] uppercase flex items-center gap-2">
                 <span className="material-symbols-outlined text-[16px]">psychology</span> Extraction Targets
               </h4>
            </div>
            
            <label className="flex items-center justify-between p-3 rounded bg-[#f2f3ff] border border-[#c5c5d7]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0426be]">psychology</span>
                <span className="text-[16px] text-[#131b2e] font-medium">Core Product Details</span>
              </div>
              <div className="relative inline-flex items-center">
                <input type="checkbox" className="w-5 h-5 border-[#0426be] text-[#0426be] rounded focus:ring-[#0426be]" checked readOnly />
              </div>
            </label>
            
            <label className="flex items-center justify-between p-3 rounded bg-[#f2f3ff] border border-[#c5c5d7]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0426be]">account_tree</span>
                <span className="text-[16px] text-[#131b2e] font-medium">Category Mapping</span>
              </div>
              <div className="relative inline-flex items-center">
                <input type="checkbox" className="w-5 h-5 border-[#0426be] text-[#0426be] rounded focus:ring-[#0426be]" checked readOnly />
              </div>
            </label>
            
            <label className="flex items-center justify-between p-3 rounded hover:bg-[#eaedff] border border-transparent hover:border-[#c5c5d7] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#757686] group-hover:text-[#0426be] transition-colors">subject</span>
                <span className="text-[16px] text-[#131b2e] font-medium">Auto-Draft Article</span>
              </div>
              <div className="relative inline-flex items-center">
                <input type="checkbox" className="w-5 h-5 border-[#757686] text-[#0426be] rounded focus:ring-[#0426be]" />
              </div>
            </label>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-[#c5c5d7] bg-[#faf8ff] flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-mono text-[13px] font-medium text-[#757686]">EST. TIME: <span className="text-[#131b2e]">30s - 1m</span></span>
          </div>
          <button 
            onClick={handleProcess}
            disabled={!url || systemStatus === 'RUNNING'}
            className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 rounded text-[20px] font-semibold transition-all shadow-sm flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            {systemStatus === 'RUNNING' ? 'PROCESSING...' : systemStatus === 'COMPLETED' ? 'SUCCESS' : 'START PROCESSING'}
          </button>
        </div>
      </div>
    </div>
  );
}
