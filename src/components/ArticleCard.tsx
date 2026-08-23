import Link from 'next/link';
import { Article } from '@/lib/supabase';

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/reviews/${article.slug}`} className="block group">
      <div className="bg-viafinds-surface border border-viafinds-border rounded-xl p-6 hover:border-viafinds-accent/50 transition-colors h-full">
        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-viafinds-surfaceHover text-viafinds-muted mb-3">
          {article.category}
        </span>
        <h3 className="text-lg font-semibold text-viafinds-text mb-2 group-hover:text-viafinds-accent transition-colors line-clamp-2">
          {article.title}
        </h3>
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-viafinds-muted">
            {article.rating ? `${article.rating}/10` : 'N/A'}
          </span>
          <span className="text-xs text-viafinds-muted">
            {new Date(article.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
