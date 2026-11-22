-- Sample data: three upcoming events (7, 8 and 9 days from the day you run
-- this, Boston time) and three sample sign-ups on FounderConnect so you can see
-- "remaining spots" in action. Safe to delete from the app afterwards.
--
-- Run after the migration (SQL Editor, or automatically by `supabase db reset`
-- locally).

with d as (
  select (now() at time zone 'America/New_York')::date + 7 as d1,
         (now() at time zone 'America/New_York')::date + 8 as d2,
         (now() at time zone 'America/New_York')::date + 9 as d3
)
insert into public.events
  (name, tagline, date, start_time, end_time, location_type, location_text,
   location_lat, location_lng, volunteers_needed, slug)
select 'FounderConnect', 'An evening of founder-to-founder networking', d1, time '18:00', time '20:30',
       'specific', 'CIC, 1 Broadway, Cambridge, MA 02142', 42.3628031, -71.0834809, 8,
       'founderconnect-' || to_char(d1, 'mon-FMDD')
  from d
union all
select 'Built in Boston', 'Celebrating the startups and builders shaping our city', d2, time '17:30', time '20:00',
       'specific', 'Boston City Hall, 1 City Hall Square, Boston, MA 02201', 42.3603713, -71.0579762, 12,
       'built-in-boston-' || to_char(d2, 'mon-FMDD')
  from d
union all
select 'Blueprints & Big Ideas', 'Founders share the plans behind their boldest ideas', d3, time '18:00', time '20:00',
       'generic', 'Downtown Crossing area', null, null, 6,
       'blueprints-big-ideas-' || to_char(d3, 'mon-FMDD')
  from d;

insert into public.volunteers (event_id, name, email)
select e.id, v.name, v.email
  from public.events e
 cross join (values
   ('Avery Chen',   'avery.chen@example.com'),
   ('Jordan Ruiz',  'jordan.ruiz@example.com'),
   ('Sam Okafor',   'sam.okafor@example.com')
 ) as v(name, email)
 where e.name = 'FounderConnect';
