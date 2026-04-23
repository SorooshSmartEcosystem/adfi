-- Enable Row Level Security on every user-owned table.
-- Supabase service role bypasses RLS; authenticated/anon roles respect it.
-- Policies below restrict rows to the authenticated user via auth.uid().

alter table "users" enable row level security;
alter table "subscriptions" enable row level security;
alter table "phone_numbers" enable row level security;
alter table "agent_context" enable row level security;
alter table "connected_accounts" enable row level security;
alter table "content_drafts" enable row level security;
alter table "content_posts" enable row level security;
alter table "messages" enable row level security;
alter table "calls" enable row level security;
alter table "appointments" enable row level security;
alter table "competitors" enable row level security;
alter table "findings" enable row level security;
alter table "agent_events" enable row level security;

-- Users table: a user can only access their own row (id = auth.uid()).
create policy "users_self_access" on "users"
  for all using (auth.uid() = id);

-- All other user-owned tables: user_id = auth.uid().
create policy "subscriptions_user_access" on "subscriptions"
  for all using (auth.uid() = user_id);

create policy "phone_numbers_user_access" on "phone_numbers"
  for all using (auth.uid() = user_id);

create policy "agent_context_user_access" on "agent_context"
  for all using (auth.uid() = user_id);

create policy "connected_accounts_user_access" on "connected_accounts"
  for all using (auth.uid() = user_id);

create policy "content_drafts_user_access" on "content_drafts"
  for all using (auth.uid() = user_id);

create policy "content_posts_user_access" on "content_posts"
  for all using (auth.uid() = user_id);

create policy "messages_user_access" on "messages"
  for all using (auth.uid() = user_id);

create policy "calls_user_access" on "calls"
  for all using (auth.uid() = user_id);

create policy "appointments_user_access" on "appointments"
  for all using (auth.uid() = user_id);

create policy "competitors_user_access" on "competitors"
  for all using (auth.uid() = user_id);

create policy "findings_user_access" on "findings"
  for all using (auth.uid() = user_id);

create policy "agent_events_user_access" on "agent_events"
  for all using (auth.uid() = user_id);
