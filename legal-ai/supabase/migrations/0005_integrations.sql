-- Integration connections (API keys and OAuth tokens for external services)
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  api_key text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  config jsonb,
  enabled boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

alter table integrations enable row level security;

create policy "Users manage own integrations"
  on integrations for all
  using (auth.uid() = user_id);
