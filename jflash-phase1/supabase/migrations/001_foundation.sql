-- J Flash Scholars: Phase 1 (foundation)
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- One profile per login. Created automatically when someone registers.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text not null default '',
  phone         text,
  school        text,
  role          text not null default 'aspirant' check (role in ('aspirant', 'admin')),
  email_opt_in  boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- One account per email address (case-insensitive).
create unique index profiles_email_key on public.profiles (lower(email));

alter table public.profiles enable row level security;

-- People can read and edit only their own profile.
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Lock the table down: browsers may only change these four fields.
-- Nobody can make themselves an admin from the browser.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, school, email_opt_in) on public.profiles to authenticated;

-- Create the profile automatically at registration.
-- Note: the role is NEVER read from what the person typed in.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, school, email_opt_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'school', ''),
    (new.raw_user_meta_data->>'email_opt_in') = 'true'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by later phases to decide who is an admin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;
