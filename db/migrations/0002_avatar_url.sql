-- Cache the user's Google profile picture URL so other screens (voter chips,
-- people pages) can render it without hitting the live Supabase auth session.
-- Refreshed on every sign-in by app/auth/callback/route.ts.
alter table users add column if not exists avatar_url text;
