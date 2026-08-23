import { supabase } from '@/lib/supabase';
import { Article } from '@/lib/supabase';
import ArticleTable from '@/components/ArticleTable';

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

export default async function ContentCrmPage() {
  const articles = await getArticles();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-viafinds-text mb-8">Content CRM</h1>
      <ArticleTable articles={articles} />
    </div>
  );
}
