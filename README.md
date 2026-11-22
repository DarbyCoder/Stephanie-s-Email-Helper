# Volunteer Hub · Startup Boston

The organizer posts events that need volunteers, generates a "call for volunteers" email, and
volunteers sign up on a public page (`/e/<event>`) instead of replying to the email.

Next.js 16 (App Router, TypeScript) · Tailwind 4 · Supabase (Postgres + Auth) · Vercel.

## How it fits together

- **Organizer** (`/admin`, login required): event list, create/edit/delete, roster per event, email generator, settings.
- **Public**: `/` lists upcoming events, `/e/<slug>` is the sign-up page.
- **Supabase is only called from the server.** The keys have no `NEXT_PUBLIC_` prefix, so the browser never sees
  them and bots have to go through the form (which has a honeypot).
- **Rules live in Postgres** (`supabase/migrations/`):
  - Row level security. The public can read non-sensitive event columns and add a volunteer to an event that
    hasn't ended. Only accounts listed in `public.admins` can see volunteers or change anything.
  - A trigger on `volunteers` locks the event row, rejects duplicate emails, and rejects sign-ups past
    `volunteers_needed`. Parallel sign-ups can't overfill an event: tested with 50 simultaneous sign-ups for
    10 spots, and exactly 10 were accepted.
- **Address lookup** uses OpenStreetMap Nominatim through a server action, following their usage policy:
  - It runs on the server because browsers can't set a User-Agent, and the app's own User-Agent identifies it.
  - Requests are throttled to at most 1 per second and results are cached.
  - A lookup only runs when you click the button, and the OSM attribution is shown.
- **Keep-alive:** `vercel.json` runs a daily cron against `/api/keepalive`, so the free Supabase project doesn't
  pause after a week of no traffic.

## 1. Set up the database (once)

**Option A: SQL Editor (no tools needed).** In the Supabase dashboard, open **SQL Editor → New query**:

1. Paste all of `supabase/migrations/20261122000000_init.sql` and click **Run**.
2. Optional sample data: paste `supabase/seed.sql` and click **Run**. It adds three events dated 7–9 days out
   and three sample sign-ups.

**Option B: Supabase CLI.**

```bash
npx supabase@3.2.0 login
```

```bash
npx supabase@3.2.0 link --project-ref <your-project-ref>
```

```bash
npx supabase@3.2.0 db push --include-seed
```

Drop `--include-seed` if you don't want the sample events. Later schema changes go in new files in
`supabase/migrations/` and are applied with `db push`.

## 2. Create the organizer login (once)

1. **Authentication → Users → Add user → Create new user.** Enter your email and a password, and tick
   **Auto Confirm User**.
2. Put that account on the organizer allowlist. In the SQL Editor, run:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@startupboston.org';
   ```

3. **Turn off public sign-ups.** Under **Authentication → Sign In / Providers**, switch off **Allow new users to
   sign up**. The allowlist already blocks strangers from data, but there's no reason to let them create accounts.

If you log in with an account that isn't on the allowlist, the app sends you to a page that shows the SQL above.

## 3. Run locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`. Both values are under **Project Settings → API Keys** and the project's URL:

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # a legacy "anon" key works too
```

```bash
npm run dev
```

Open http://localhost:3000/admin and sign in.

Other checks: `npm run lint`, `npm run typecheck`, `npm run build`.

**Fully local database (optional, needs Docker):** `npx supabase@3.2.0 start` runs Postgres, Auth and the API
on your machine and applies the migration and seed. Put the URL and publishable key it prints into
`.env.local`. Self sign-up is already off in `supabase/config.toml`, so create the organizer with the local Studio
or the Auth admin API, then add it to `public.admins` as above.

## 4. Deploy to Vercel

1. In Vercel, go to **Add New → Project** and import this GitHub repository. The framework is detected as Next.js.
2. Add these under **Environment Variables**:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`: required, same values as `.env.local`.
   - `CRON_SECRET`: optional. Any long random string. Vercel Cron sends it automatically, and `/api/keepalive`
     then rejects anyone else.
   - `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SITE_URL`: optional, turn on volunteer confirmation
     emails (see below).
   - `NOMINATIM_USER_AGENT`: optional, e.g. `StartupBoston-VolunteerHub/1.0 (https://your-site.vercel.app)`.
3. Click **Deploy**.
4. Open `https://<your-site>/admin`, go to **Settings**, and set **Site base URL** to the production address.
   Sign-up links in emails use it; when it's blank they use whatever address you opened the app on.
5. Check **Settings → Cron Jobs** in Vercel: `/api/keepalive` should be listed (daily).

## Using it

- **Events**: soonest first, with past events folded under "Past". Click a name to edit, or the count to open the
  roster. A slug is generated once (e.g. `/e/founderconnect-nov-28`) and never changes, so links you've already
  emailed keep working after edits.
- **Email**: tick events (unsent events with open spots are pre-selected; full events can't be picked). The
  subject and text update live. You can edit either before sending, and "Regenerate" undoes your edits. Then
  click **Open in Gmail**, or use copy / your mail app. When it's sent, click **Mark selected events as sent**.
- **Settings**: intro, outro, signature, site base URL, and an optional Gmail account (adds `authuser=` so the
  draft opens in that account). In the intro, `{{event_count}}` becomes "THREE events" / "ONE event".

## Confirmation emails (optional, Resend)

When `RESEND_API_KEY` and `EMAIL_FROM` are set, each volunteer gets a plain-text confirmation with the
event's date, time, place and link. It's sent after the sign-up response, so a slow or failing email never
blocks or breaks a sign-up; failures show up in Vercel's logs.

1. Create a free account at resend.com and go to **Domains → Add domain** (e.g. `startupboston.org`). Add the
   DNS records it shows at your domain host and wait for "Verified".
2. **API Keys → Create API key** with "Sending access".
3. In Vercel, add these environment variables, then **Redeploy**:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=Startup Boston <volunteers@startupboston.org>` (must use the verified domain)
   - `EMAIL_REPLY_TO=you@startupboston.org`, so replies like "I can't make it" reach you
   - `SITE_URL=https://<your-site>.vercel.app`, used for the event link in the email

## Decisions and assumptions

- **Time zone:** dates and times are stored as Boston local time (`date` and `time` columns). The weekday,
  "today" and past/upcoming are all computed in America/New_York.
- **When sign-ups close:** an event is "past" once its end time has passed, and sign-ups close at the same moment
  (enforced in RLS too). The end time must be after the start time, so events can't run past midnight.
- **Spot counts:** "we need N people" uses the remaining spots ("1 person" when there's one left).
- **Outro text:** "As a volunteer, you'll:" is part of the default outro text, so you can edit it.
- **Duplicates:** emails are trimmed and lowercased, so `Jane@X.com` and `jane@x.com` count as the same person.
- **Map links** go to Google Maps. With a looked-up pin they use the exact coordinates; otherwise they search the
  address text. Editing the address after a lookup clears the pin, so a stale pin can't point to the wrong
  place.
- **Spam protection:** a hidden honeypot field. Bots that fill it see a fake success and nothing is saved.
- **No service role key.** Nothing in the app needs to bypass RLS.
