'use client';

import { useState } from 'react';
import { Article } from '@/lib/supabase';

export default function SlideOver({ article, onClose }: { article: Article; onClose: () => void }) {
  const [formData, setFormData] = useState<Article>(article);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        content: formData.content,
        rating: formData.rating,
        pros: formData.pros,
        cons: formData.cons,
        eeat_status: formData.eeat_status,
        automation_score: formData.automation_score,
      }),
    });

    if (res.ok) {
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-viafinds-surface border-l border-viafinds-border shadow-xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-viafinds-border">
            <h2 className="text-lg font-semibold text-viafinds-text">Edit Article</h2>
            <button onClick={onClose} className="text-viafinds-muted hover:text-viafinds-text">
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-viafinds-muted mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-viafinds-bg border border-viafinds-border rounded-lg px-3 py-2 text-viafinds-text focus:outline-none focus:border-viafinds-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-viafinds-muted mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className="w-full bg-viafinds-bg border border-viafinds-border rounded-lg px-3 py-2 text-viafinds-text focus:outline-none focus:border-viafinds-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-viafinds-muted mb-1">Rating (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.rating ?? ''}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-viafinds-bg border border-viafinds-border rounded-lg px-3 py-2 text-viafinds-text focus:outline-none focus:border-viafinds-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-viafinds-muted mb-1">E-E-A-T Status</label>
              <input
                type="text"
                value={formData.eeat_status ?? ''}
                onChange={(e) => setFormData({ ...formData, eeat_status: e.target.value })}
                className="w-full bg-viafinds-bg border border-viafinds-border rounded-lg px-3 py-2 text-viafinds-text focus:outline-none focus:border-viafinds-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-viafinds-muted mb-1">Automation Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.automation_score ?? ''}
                onChange={(e) => setFormData({ ...formData, automation_score: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-viafinds-bg border border-viafinds-border rounded-lg px-3 py-2 text-viafinds-text focus:outline-none focus:border-viafinds-accent"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-viafinds-border flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-viafinds-muted hover:text-viafinds-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-viafinds-accent hover:bg-viafinds-accentHover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
