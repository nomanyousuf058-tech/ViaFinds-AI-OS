import { createClient } from '@supabase/supabase-js';
export const supabaseServer = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase service role key not configured');
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
  } catch (err) {
    return false;
  }
};