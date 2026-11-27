-- Planned Supabase schema (not used yet; the API runs on an in-memory cache
-- until a Supabase project exists). Run this in the Supabase SQL editor.

-- One row per feed observation we fetch: buoy reading, water level, etc.
-- Gives us (1) the last good value when a source is down and
-- (2) the "last 7 days" history screen.
create table if not exists readings (
  id           bigint generated always as identity primary key,
  feed         text        not null,          -- e.g. 'buoy:51205', 'level:1615680'
  observed_at  timestamptz not null,          -- when the source measured it
  fetched_at   timestamptz not null default now(),
  payload      jsonb       not null,          -- normalized reading
  unique (feed, observed_at)
);
create index if not exists readings_feed_time on readings (feed, observed_at desc);

-- Keep 30 days; the app shows 7, the rest is for tuning the clarity estimate.
-- (Schedule with pg_cron:  select cron.schedule('prune', '0 3 * * *', $$delete from readings where observed_at < now() - interval '30 days'$$);)

alter table readings enable row level security;
-- The mobile app only talks to our API, never to Supabase directly,
-- so no public policies: only the server's service-role key can read/write.
