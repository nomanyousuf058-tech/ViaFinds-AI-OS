import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  rating: number | null;
  pros: string[];
  cons: string[];
  eeat_status: string | null;
  automation_score: number | null;
  created_at: string;
};

export type RevenueLog = {
  id: string;
  source_type: 'Display Ad' | 'Affiliate';
  network_name: string;
  amount: number;
  timestamp: string;
};

export type ApiIntegration = {
  id: string;
  provider_name: string;
  api_key_masked: string;
  status: string;
  mode: 'Manual' | 'Automated';
};

export type AutomationLog = {
  id: string;
  step_name: string;
  status: string;
  conf_percentage: number | null;
  timestamp: string;
};
