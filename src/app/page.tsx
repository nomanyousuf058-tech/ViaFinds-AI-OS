import { supabase } from '@/lib/supabase';
import { Article } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';

async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    return [];
  }

  return data || [];
}

export default async function HomePage() {
  const articles = await getArticles();

  const categories = ['All', 'AI Tools', 'Software', 'Creator Assets'];
  const [aiTools, software, creatorAssets] = [
    articles.filter((a) => a.category === 'AI Tools'),
    articles.filter((a) => a.category === 'Software'),
    articles.filter((a) => a.category === 'Creator Assets'),
  ];

  return (
    <div className="min-h-screen bg-viafinds-bg">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-viafinds-text">
            Curated Software & Tools
          </h1>
          <p className="mt-4 text-lg text-viafinds-muted max-w-2xl mx-auto">
            Authority-grade reviews and recommendations for AI tools, software, and digital assets.
          </p>
        </section>

        {/* Category Navigation */}
        <nav className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <span
              key={cat}
              className="px-4 py-2 rounded-full text-sm font-medium bg-viafinds-surface text-viafinds-muted border border-viafinds-border"
            >
              {cat}
            </span>
          ))}
        </nav>

        {/* Featured / AI Tools */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-viafinds-text">AI Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiTools.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        {/* Software */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-viafinds-text">Software</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {software.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        {/* Creator Assets */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-viafinds-text">Creator Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatorAssets.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
