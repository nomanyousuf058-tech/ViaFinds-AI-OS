'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DiscoveryEngine() {
  const [filter, setFilter] = useState('All Categories');
  const [search, setSearch] = useState('');
  const [trendScore, setTrendScore] = useState(85);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/discovery/trending?q=${encodeURIComponent(search)}`);
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'CONNECTION_REQUIRED') {
          setError('CONNECTION_REQUIRED');
        } else {
          setError(data.message || 'Failed to fetch products');
        }
        setProducts([]);
      } else {
        setProducts(data.products || []);
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filter]); // Re-fetch on filter change initially, search is manual

  const handleScan = () => {
    fetchProducts();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[28px] font-bold text-[#131b2e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0426be]" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
            Discovery Engine
          </h2>
          <p className="text-[14px] text-[#444655] mt-1">Real-time market analysis and product opportunity identification.</p>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-4 bg-white text-[#131b2e] border border-[#c5c5d7] hover:bg-[#f2f3ff] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">tune</span> SAVED FILTERS
          </button>
          <button onClick={handleScan} className="h-9 px-4 bg-[#0426be] text-white hover:bg-[#031d99] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">refresh</span> SCAN MARKET
          </button>
        </div>
      </div>

      {/* Discovery Filters (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
        <div className="md:col-span-6 lg:col-span-5 bg-white border border-[#c5c5d7] rounded-xl p-4 shadow-sm">
          <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#444655] mb-2">COMMAND QUERY</label>
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3 text-[#757686] text-[20px]">search</span>
            <input 
              className="w-full pl-10 pr-12 py-2 bg-white border border-[#c5c5d7] rounded-lg font-mono text-[13px] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-[#006a61] transition-shadow" 
              placeholder="Search keywords, ASIN, or URL..." 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute right-3 px-1.5 py-0.5 bg-[#eaedff] rounded border border-[#c5c5d7] text-[10px] font-mono text-[#757686]">⌘K</div>
          </div>
        </div>
        
        <div className="md:col-span-3 lg:col-span-3 bg-white border border-[#c5c5d7] rounded-xl p-4 shadow-sm">
          <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#444655] mb-2">CATEGORY VECTORS</label>
          <div className="relative">
            <select 
              className="w-full pl-3 pr-8 py-2 appearance-none bg-white border border-[#c5c5d7] rounded-lg text-[14px] text-[#131b2e] focus:outline-none focus:ring-2 focus:ring-[#006a61] focus:border-[#006a61] transition-shadow"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All Categories</option>
              <option>Tech Accessories</option>
              <option>Home Office</option>
              <option>Health & Wellness</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#757686] text-[18px] pointer-events-none">expand_more</span>
          </div>
        </div>
        
        <div className="md:col-span-3 lg:col-span-4 bg-white border border-[#c5c5d7] rounded-xl p-4 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-[12px] font-semibold tracking-[0.05em] text-[#444655]">MIN TREND VELOCITY</label>
            <span className="font-mono text-[13px] font-bold text-[#0426be]">{trendScore}/100</span>
          </div>
          <div className="relative w-full pt-2">
            <input 
              className="w-full accent-[#0426be]" 
              max="100" 
              min="0" 
              type="range" 
              value={trendScore}
              onChange={(e) => setTrendScore(parseInt(e.target.value))}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[10px] font-mono text-[#757686]">0</span>
              <span className="text-[10px] font-mono text-[#757686]">100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white border border-[#c5c5d7] rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Actions */}
        <div className="px-4 py-3 border-b border-[#c5c5d7] bg-[#faf8ff] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-[20px] font-semibold text-[#131b2e]">Trending Products</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#444655] font-mono text-[11px]">{products.length} Results</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 border border-[#c5c5d7] text-[#131b2e] hover:bg-[#f2f3ff] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">checklist</span> PROCESS SELECTED
            </button>
            <button className="h-8 px-3 bg-[#006a61] text-white hover:bg-[#00524b] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add_circle</span> ADD ALL TO PIPELINE
            </button>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff] border-b border-[#c5c5d7]">
                <th className="px-4 py-3 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 border-[#757686] text-[#0426be] rounded focus:ring-[#0426be]" />
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold tracking-[0.05em] text-[#444655]">PRODUCT SIGNAL</th>
                <th className="px-4 py-3 text-[12px] font-semibold tracking-[0.05em] text-[#444655]">CATEGORY</th>
                <th className="px-4 py-3 text-[12px] font-semibold tracking-[0.05em] text-[#444655] text-right">TREND SCORE</th>
                <th className="px-4 py-3 text-[12px] font-semibold tracking-[0.05em] text-[#444655]">METRICS</th>
                <th className="px-4 py-3 text-[12px] font-semibold tracking-[0.05em] text-[#444655] text-right">PRICE</th>
                <th className="px-4 py-3 text-[12px] font-semibold tracking-[0.05em] text-[#444655] text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-[#131b2e] divide-y divide-[#c5c5d7]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#757686]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
                      <p>Scanning marketplace for opportunities...</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error === 'CONNECTION_REQUIRED' && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="bg-[#fff4ed] border border-[#f5b896] rounded-lg p-6 max-w-md mx-auto">
                      <span className="material-symbols-outlined text-[#d45a16] text-[32px] mb-2">link_off</span>
                      <h4 className="text-[#963705] font-bold text-[16px] mb-1">Connection Required</h4>
                      <p className="text-[#d45a16] text-[13px] mb-4">You need to configure an affiliate partner (like Digistore24) to discover real products.</p>
                      <Link href="/dashboard/connections" className="inline-flex items-center justify-center h-9 px-4 bg-[#d45a16] text-white hover:bg-[#b04a11] rounded text-[12px] font-semibold tracking-[0.05em] transition-colors">
                        GO TO CONNECTIONS
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error && error !== 'CONNECTION_REQUIRED' && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#d45a16]">
                    <p>Error: {error}</p>
                  </td>
                </tr>
              )}
              {!loading && !error && products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#757686]">
                    <p>No trending products found. Try adjusting your filters.</p>
                  </td>
                </tr>
              )}
              {!loading && !error && products.map((p, idx) => (
                <tr key={p.id || idx} className="hover:bg-[#f1f5f9] transition-colors group">
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" className="w-4 h-4 border-[#757686] text-[#0426be] rounded focus:ring-[#0426be]" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#faf8ff] border border-[#c5c5d7] overflow-hidden shrink-0 flex items-center justify-center text-[#c5c5d7]">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined">image_not_supported</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-[#131b2e] group-hover:text-[#0426be] transition-colors flex items-center gap-2 line-clamp-1 max-w-[200px]" title={p.name}>
                          {p.name}
                          {p.score > 90 && <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_4px_#10B981]"></span>}
                        </div>
                        <div className="text-[12px] text-[#757686] font-mono mt-0.5">{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#444655] truncate max-w-[120px]">{p.category}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <span className={`material-symbols-outlined text-[16px] ${p.score > 90 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                        {p.score > 90 ? 'trending_up' : 'trending_flat'}
                      </span>
                      <span className="font-mono font-bold text-[#131b2e]">{p.score}</span><span className="text-[#757686] text-[10px]">/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between items-center w-32">
                        <span className="text-[#757686]">Demand:</span>
                        <span className={`font-medium px-1.5 rounded ${p.demand === 'High' ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#F59E0B] bg-[#F59E0B]/10'}`}>{p.demand}</span>
                      </div>
                      <div className="flex justify-between items-center w-32">
                        <span className="text-[#757686]">Comp:</span>
                        <span className={`font-medium px-1.5 rounded ${p.comp === 'Low' ? 'text-[#10B981] bg-[#10B981]/10' : p.comp === 'Medium' ? 'text-[#F59E0B] bg-[#F59E0B]/10' : 'text-[#EF4444] bg-[#EF4444]/10'}`}>{p.comp}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{p.price}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-[#444655] hover:text-[#0426be] hover:bg-[#faf8ff] rounded transition-colors" title="View Details">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button className="p-1.5 text-[#006a61] hover:text-white hover:bg-[#006a61] rounded transition-colors" title="Add to Pipeline">
                        <span className="material-symbols-outlined text-[18px]">queue</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-[#c5c5d7] bg-[#faf8ff] flex items-center justify-between">
          <span className="text-[14px] text-[#444655]">Showing {products.length > 0 ? 1 : 0}-{Math.min(20, products.length)} of {products.length} results</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-[#757686] hover:bg-[#dae2fd] transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded bg-[#0426be] text-white font-mono text-[12px] flex items-center justify-center">1</button>
            <button className="w-8 h-8 rounded hover:bg-[#dae2fd] text-[#444655] font-mono text-[12px] flex items-center justify-center transition-colors">2</button>
            <button className="w-8 h-8 rounded hover:bg-[#dae2fd] text-[#444655] font-mono text-[12px] flex items-center justify-center transition-colors">3</button>
            <span className="text-[#757686] mx-1">...</span>
            <button className="p-1 rounded text-[#131b2e] hover:bg-[#dae2fd] transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
