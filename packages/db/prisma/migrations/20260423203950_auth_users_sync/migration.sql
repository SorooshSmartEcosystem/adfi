-- Sync auth.users → public.users on signup.
-- Without this, RLS policies using auth.uid() = id/user_id match no rows,
-- because auth.users and public.users would have independent id spaces.
-- security definer gives the function privileges to insert into public.users
-- when invoked from the auth schema's trigger context.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, phone, created_at, updated_at)
  values (new.id, new.email, new.phone, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
