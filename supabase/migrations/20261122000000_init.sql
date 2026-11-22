-- Volunteer Hub: initial schema.
--
-- Run once against your Supabase project, either by pasting this file into the
-- SQL Editor or with `npx supabase db push` (see README).
--
-- Security model
--   * anon (the public):   read non-sensitive event columns, read signup
--                           counts, and add a volunteer to an event that hasn't
--                           ended. Nothing else.
--   * organizer:            a signed-in user listed in public.admins. Full
--                           access to events, volunteers and settings.
--   * any other signed-in user (e.g. if self sign-up is ever left on): no
--                           access to volunteers or settings and can't change
--                           events. Being "authenticated" alone grants nothing.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 200),
  tagline           text not null default '' check (char_length(tagline) <= 300),
  date              date not null,
  start_time        time not null,
  end_time          time not null,
  location_type     text not null check (location_type in ('specific', 'generic')),
  location_text     text not null check (char_length(btrim(location_text)) between 1 and 300),
  location_lat      double precision check (location_lat between -90 and 90),
  location_lng      double precision check (location_lng between -180 and 180),
  volunteers_needed integer not null check (volunteers_needed between 1 and 1000),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  email_sent        boolean not null default false,
  created_at        timestamptz not null default now(),

  constraint events_end_after_start check (end_time > start_time),
  constraint events_coords_together check ((location_lat is null) = (location_lng is null)),
  constraint events_coords_only_specific check (location_type = 'specific' or location_lat is null)
);

create index events_date_idx on public.events (date, start_time);

create table public.volunteers (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  email      text not null check (
               char_length(email) <= 254
               and email = lower(email)
               and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
             ),
  created_at timestamptz not null default now(),

  unique (event_id, email)
);

-- Single-row settings table (id is always true).
create table public.settings (
  id            boolean primary key default true check (id),
  email_intro   text not null default '',
  email_outro   text not null default '',
  signature     text not null default '',
  site_base_url text not null default '',
  gmail_account text not null default ''
);

-- Organizer allowlist. Add your auth user id here after creating your login.
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- True when the current signed-in user is on the organizer allowlist.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Signup counts for a set of events. Exposes counts only, never who signed up.
-- Events with no signups are omitted (treat as 0).
create function public.get_spots_filled(event_ids uuid[])
returns table (event_id uuid, spots_filled integer)
language sql
stable
security definer
set search_path = ''
as $$
  select v.event_id, count(*)::integer
  from public.volunteers v
  where v.event_id = any (event_ids)
  group by v.event_id;
$$;

-- Runs before every volunteer insert, whatever the source (public form, SQL
-- editor, API). Normalizes input, then enforces "no duplicate email" and
-- "never more than volunteers_needed" atomically: the event row is locked, so
-- concurrent signups for the same event are checked one at a time and each
-- one sees the rows the previous one committed.
create function public.volunteers_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_needed integer;
  v_filled integer;
begin
  new.name  := btrim(new.name);
  new.email := lower(btrim(new.email));

  select e.volunteers_needed
    into v_needed
    from public.events e
   where e.id = new.event_id
     for update;

  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.volunteers v
     where v.event_id = new.event_id and v.email = new.email
  ) then
    raise exception 'already_signed_up' using errcode = '23505';
  end if;

  select count(*) into v_filled from public.volunteers v where v.event_id = new.event_id;

  if v_filled >= v_needed then
    raise exception 'event_full' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger volunteers_before_insert
before insert on public.volunteers
for each row execute function public.volunteers_before_insert();

-- ---------------------------------------------------------------------------
-- Privileges: don't rely on Supabase's default grants (which give anon and
-- authenticated everything, or nothing on some projects). Grant each role
-- exactly what it needs; RLS then filters rows.
-- ---------------------------------------------------------------------------

revoke all on public.events, public.volunteers, public.settings, public.admins from anon, authenticated;

-- Signed-in users: table access as needed by the organizer; RLS below limits
-- every row to the organizer (anyone else gets the public's view).
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, delete on public.volunteers to authenticated;
grant select, update on public.settings to authenticated;

-- Public: non-sensitive event columns only (no email_sent, no created_at).
grant select (id, name, tagline, date, start_time, end_time, location_type, location_text,
              location_lat, location_lng, volunteers_needed, slug)
  on public.events to anon;

-- Public: add a volunteer, setting only these columns.
grant insert (event_id, name, email) on public.volunteers to anon;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.get_spots_filled(uuid[]) from public;
grant execute on function public.get_spots_filled(uuid[]) to anon, authenticated;

-- Trigger function: never callable directly.
revoke execute on function public.volunteers_before_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.events     enable row level security;
alter table public.volunteers enable row level security;
alter table public.settings   enable row level security;
alter table public.admins     enable row level security;  -- no policies: invisible via the API

-- events
create policy "Anyone can read events"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Organizer can create events"
  on public.events for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Organizer can update events"
  on public.events for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Organizer can delete events"
  on public.events for delete
  to authenticated
  using ((select public.is_admin()));

-- volunteers
create policy "Anyone can sign up for an event that hasn't ended"
  on public.volunteers for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.events e
       where e.id = volunteers.event_id
         and (e.date + e.end_time) > (now() at time zone 'America/New_York')
    )
  );

create policy "Organizer can read volunteers"
  on public.volunteers for select
  to authenticated
  using ((select public.is_admin()));

create policy "Organizer can remove volunteers"
  on public.volunteers for delete
  to authenticated
  using ((select public.is_admin()));

-- settings
create policy "Organizer can read settings"
  on public.settings for select
  to authenticated
  using ((select public.is_admin()));

create policy "Organizer can update settings"
  on public.settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Default settings row (edit later on the Settings page)
-- ---------------------------------------------------------------------------

insert into public.settings (id, email_intro, email_outro, signature)
values (
  true,
  E'Hi everyone!\n\nStartup Boston has {{event_count}} coming up and we need volunteers to help make them happen. Grab a spot using the sign-up links below. Spots are first come, first served!',
  E'As a volunteer, you''ll:\n- Welcome guests and help with check-in\n- Keep the event running smoothly\n- Meet founders, investors, and builders from across Boston\n- Get into the event for free',
  E'Thank you!\nThe Startup Boston Team'
);
