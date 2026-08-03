# DriveDesk — Single-File Car Dealer Portal

Everything — login, admin dashboard, dealer dashboard — lives in **one
file: `index.html`**. No separate CSS/JS files, no page navigation;
views switch instantly with JavaScript.

## ⚠️ Fix your login first — do this before anything else

Your console showed:
```
net::ERR_NAME_NOT_RESOLVED
yjutxjmkrpdlhhbelwg....supabase.co/rest/v1/rpc/admin_login
```
This means the browser could not find that address at all — it's not
a code bug, it's a project/URL problem. Check, in this order:

1. **Open your Supabase dashboard.** If the project shows **"Paused"**
   (free-tier projects auto-pause after about a week of no activity),
   click **Resume project**. This is the most common cause.
2. **Settings → API → Project URL.** Copy it exactly and compare it
   to the `SUPABASE_URL` value near the top of the `<script>` block
   in `index.html`. If it's different, replace it.
3. **Settings → API → Project API keys.** Copy the current
   **anon / publishable** key and replace `SUPABASE_KEY` in the same
   place if it doesn't match.
4. Make sure you've actually run `schema.sql` in the SQL Editor —
   if the tables/functions don't exist yet, login will fail with a
   different error ("function admin_login does not exist"), which
   tells you it's a schema problem, not a connection problem.

Once the URL/key are confirmed correct and the project is resumed,
reload the page and try `admin` / `1234` (the seeded default login).

## Run it

No build step. Two options:

- **Quick local test:** double-click `index.html` — it'll open via
  `file://`. This mostly works, but some browsers restrict things
  over `file://`, so if you see odd behavior, use a local server
  instead:
  ```bash
  npx serve .
  ```
- **Production:** upload `index.html` as-is to any static host —
  Netlify, Vercel, GitHub Pages, Cloudflare Pages, your own server.
  Nothing to build.

## One-time database setup

Open Supabase → **SQL Editor** → paste all of `schema.sql` → **Run**.
This creates the tables, locks them with RLS, creates the RPC
functions the page calls, and seeds a default admin:
- username: `admin`
- PIN: `1234` — **change this after your first login.**

```sql
update admins set pin_hash = crypt('NEW_PIN_HERE', gen_salt('bf'))
where username = 'admin';
```

## How it works

- One `index.html`, three `<section class="view">` blocks (login,
  admin, dealer). JavaScript toggles which one is visible — no page
  reloads, no separate files to keep in sync.
- Admin and dealer both log in through `admin_login()` /
  `dealer_login()` Postgres RPC functions. PINs are hashed with
  `pgcrypto` — never stored or compared as plain text.
- Session (role + id) is kept in `sessionStorage`, cleared when the
  tab closes.
- Every write goes through `SECURITY DEFINER` RPC functions that
  re-check the caller's id server-side — the publishable key never
  gets direct table access.
- Every button that talks to the database is wrapped in a
  duplicate-click guard (`guardClick`): it disables itself and shows
  a spinner until the request finishes, so a second tap/click/Enter
  is ignored.
- Fully responsive — one CSS file (inlined) with breakpoints down to
  360px phones.
- Network/DNS errors now show a specific, human message instead of a
  generic "something went wrong" (see `friendlyError()` in the
  script).

## File structure

```
├── index.html      # everything — markup, styles, script, all 3 views
├── schema.sql       # run once in Supabase SQL editor
└── README.md
```
