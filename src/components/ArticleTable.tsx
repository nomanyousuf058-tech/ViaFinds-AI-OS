'use client';

import { useState } from 'react';
import { Article } from '@/lib/supabase';
import SlideOver from './SlideOver';

export default function ArticleTable({ articles }: { articles: Article[] }) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  return (
    <>
      <section className="xl:col-span-2 bg-charcoal border border-slate-border rounded-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-border flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-ui-body text-ui-body font-semibold text-on-surface">Content CRM Pipeline</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-on-surface-variant">search</span>
            <input className="flat-input pl-10 py-1.5 px-4 rounded-full w-64" placeholder="Search entries..." type="text"/>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-border bg-surface-container-lowest">
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 font-normal">Title</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-4 py-4 font-normal">Category</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-4 py-4 font-normal">Score</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-4 py-4 font-normal">E-E-A-T</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-4 py-4 font-normal">Date</th>
                <th className="font-label-caps text-label-caps text-on-surface-variant px-6 py-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-mono-data text-mono-data divide-y divide-slate-border/50">
              {articles.map((article) => (
                <tr 
                  key={article.id} 
                  className="hover:bg-[#1A1A1A] transition-colors group cursor-pointer bg-surface-container-low border-l-4 border-transparent hover:border-electric-indigo"
                  onClick={() => setSelectedArticle(article)}
                >
                  <td className="px-6 py-3 font-ui-body text-ui-body font-medium truncate max-w-[200px]" title={article.title}>
                    {article.title}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{article.category}</td>
                  <td className="px-4 py-3">
                    <span className="text-secondary font-bold">{article.automation_score ?? article.rating ?? 'N/A'}</span>
                    {article.automation_score || article.rating ? '/100' : ''}
                  </td>
                  <td className="px-4 py-3">
                    {article.eeat_status === 'Verified' ? (
                      <span className="inline-flex items-center gap-1 border border-gold-leaf/30 text-gold-leaf px-2 py-0.5 rounded-full text-[11px]">
                        <span className="material-symbols-outlined text-[12px]">verified</span> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 border border-slate-border text-on-surface-variant px-2 py-0.5 rounded-full text-[11px]">
                        <span className="material-symbols-outlined text-[12px]">pending</span> {article.eeat_status || 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button className="text-on-surface-variant hover:text-electric-indigo"><span className="material-symbols-outlined text-[18px]">publish</span></button>
                      <button className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedArticle && (
        <SlideOver
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
}
