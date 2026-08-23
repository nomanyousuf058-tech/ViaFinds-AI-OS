-- Viafinds Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables.

-- Articles table
create table if not exists public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  category text not null,
  content text not null,
  rating numeric(3,1),
  pros text[] default '{}',
  cons text[] default '{}',
  eeat_status text,
  automation_score numeric(5,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Revenue logs table
create table if not exists public.revenue_logs (
  id uuid default gen_random_uuid() primary key,
  source_type text not null check (source_type in ('Display Ad', 'Affiliate')),
  network_name text not null,
  amount numeric(10,2) not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- API integrations table
create table if not exists public.api_integrations (
  id uuid default gen_random_uuid() primary key,
  provider_name text not null,
  api_key_masked text not null,
  status text not null,
  mode text not null check (mode in ('Manual', 'Automated'))
);

-- Automation logs table
create table if not exists public.automation_logs (
  id uuid default gen_random_uuid() primary key,
  step_name text not null,
  status text not null,
  conf_percentage numeric(5,2),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (optional for production)
alter table public.articles enable row level security;
alter table public.revenue_logs enable row level security;
alter table public.api_integrations enable row level security;
alter table public.automation_logs enable row level security;

-- Create policies for development (allows public access)
create policy "Allow public read access on articles" on public.articles for select using (true);
create policy "Allow public insert on articles" on public.articles for insert with check (true);
create policy "Allow public update on articles" on public.articles for update using (true);
create policy "Allow public delete on articles" on public.articles for delete using (true);

create policy "Allow public read access on revenue_logs" on public.revenue_logs for select using (true);
create policy "Allow public insert on revenue_logs" on public.revenue_logs for insert with check (true);
create policy "Allow public update on revenue_logs" on public.revenue_logs for update using (true);
create policy "Allow public delete on revenue_logs" on public.revenue_logs for delete using (true);

create policy "Allow public read access on api_integrations" on public.api_integrations for select using (true);
create policy "Allow public insert on api_integrations" on public.api_integrations for insert with check (true);
create policy "Allow public update on api_integrations" on public.api_integrations for update using (true);
create policy "Allow public delete on api_integrations" on public.api_integrations for delete using (true);

create policy "Allow public read access on automation_logs" on public.automation_logs for select using (true);
create policy "Allow public insert on automation_logs" on public.automation_logs for insert with check (true);
create policy "Allow public update on automation_logs" on public.automation_logs for update using (true);
create policy "Allow public delete on automation_logs" on public.automation_logs for delete using (true);
