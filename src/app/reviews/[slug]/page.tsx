import { supabase } from '@/lib/supabase';
import { Article } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

async function getArticle(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    console.error('Error fetching article:', error);
    return null;
  }

  return data;
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return (
      <div className="min-h-screen bg-viafinds-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-viafinds-text">Article Not Found</h1>
          <p className="mt-2 text-viafinds-muted">The review you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-viafinds-bg">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <article>
          <header className="mb-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-viafinds-accent/10 text-viafinds-accent border border-viafinds-accent/20 mb-4">
              {article.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-viafinds-text mb-4">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-viafinds-muted">
              <span>E-E-A-T: {article.eeat_status || 'N/A'}</span>
              <span>Automation Score: {article.automation_score || 'N/A'}</span>
            </div>
          </header>

          {/* Rating Summary */}
          <div className="bg-viafinds-surface border border-viafinds-border rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-2">Rating Summary</h3>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-viafinds-accent">
                {article.rating ? `${article.rating}/10` : 'N/A'}
              </span>
              <span className="text-viafinds-muted">Overall Score</span>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-viafinds-surface border border-viafinds-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-viafinds-success">Pros</h3>
              <ul className="space-y-2">
                {article.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-viafinds-text">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-viafinds-success flex-shrink-0" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-viafinds-surface border border-viafinds-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-viafinds-danger">Cons</h3>
              <ul className="space-y-2">
                {article.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-viafinds-text">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-viafinds-danger flex-shrink-0" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none mb-8">
            <div className="text-viafinds-text leading-relaxed whitespace-pre-wrap">
              {article.content}
            </div>
          </div>

          {/* Affiliate CTA */}
          <div className="bg-viafinds-surface border border-viafinds-border rounded-xl p-6 text-center">
            <p className="text-viafinds-muted mb-4">Check out the best deals for {article.title}</p>
            <button className="px-6 py-3 bg-viafinds-accent hover:bg-viafinds-accentHover text-white font-medium rounded-lg transition-colors">
              View Latest Deal
            </button>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
