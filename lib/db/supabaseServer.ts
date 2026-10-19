import { createClient } from '@supabase/supabase-js';
import { validateSupabaseClientUrl } from './guard';

export const supabaseServer = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase service role key not configured');
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL not configured');
    return null;
  }

  // Guard against staging workflow targeting production Supabase instance
  try {
    validateSupabaseClientUrl(supabaseUrl, process.env);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Supabase client blocked by database guard: ${message}`);
    return null;
  }

  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

export const checkSupabaseHealth = async (): Promise<boolean> => {
  const supabase = supabaseServer();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('health_check').select('*').limit(1);
    return !error;
  } catch {
    return false;
  }
};