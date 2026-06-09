-- Run this once in Supabase SQL editor to set up caching.

create table if not exists search_cache (
  cache_key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists search_cache_created_idx on search_cache (created_at);

-- Cleanup function: drop entries older than 1 day
create or replace function cleanup_old_cache() returns void as $$
begin
  delete from search_cache where created_at < now() - interval '1 day';
end;
$$ language plpgsql;
