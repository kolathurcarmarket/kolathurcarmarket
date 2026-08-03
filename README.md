# DriveDesk — Second-Hand Car Dealer Portal (single page, separate files)

One `index.html` — login, admin dashboard, and dealer dashboard all
live on it as three views that JavaScript switches between (no page
reloads, no navigation). CSS and JS stay in their own files under
`css/` and `js/`, the way a production project should be laid out.

## 1. Set up the database (one-time)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the entire contents of `schema.sql` and run it. This creates
   the tables, locks them down with RLS, creates the RPC functions
   the frontend calls, and seeds one default admin:
   - username: `admin`
   - PIN: `1234`

   **Change this PIN after your first login**, or directly in SQL:
   ```sql
   update admins set pin_hash = crypt('NEW_PIN_HERE', gen_salt('bf'))
   where username = 'admin';
   ```

3. `js/config.js` already has your verified Supabase URL + publishable
   key. If you ever rotate keys, update them there.

## 2. Run it

No build step. Serve the folder with any static host:

```bash
npx serve .
```

Then open `index.html` (or the URL your server prints). Deploying to
GitHub Pages, Netlify, Vercel, etc. works the same way — upload the
whole folder as-is.

## 3. How the single page works

- `index.html` has three `<section class="view">` blocks: `#view-login`,
  `#view-admin`, `#view-dealer`. Only one has the `.active` class at a
  time — `js/app.js` toggles it with `switchView()` instead of doing a
  page navigation.
- `js/app.js` is the entry point: on load it wires up all three views,
  checks `sessionStorage` for an existing session, and switches
  straight to the right dashboard if one exists.
- `js/auth.js` handles the login forms; on success it saves the
  session and calls `switchView("admin" | "dealer")` plus that view's
  loader.
- `js/admin.js` / `js/dealer.js` each expose a `wireAdminView()` /
  `wireDealerView()` (event listeners, run once) and a
  `loadAdminData()` / `loadDealerData()` (data fetch, run every time
  that view becomes active).
- Logging out just clears the session and switches back to the login
  view — same page, no reload.

## 4. Other production details (unchanged from before)

- Every write goes through `SECURITY DEFINER` Postgres RPC functions
  (`schema.sql`) — the publishable key never touches tables directly.
- PINs are hashed with `pgcrypto`, never stored or compared in plain
  text.
- Every button that hits the database is wrapped in a duplicate-click
  guard (`guardClick()` in `js/utils.js`) — disabled + spinner until
  the request finishes, so a second tap/click/Enter is ignored.
- Fully responsive, breakpoints down to 360px phones (`css/style.css`).
- Network/DB errors show a specific message (`friendlyError()` in
  `js/utils.js`) instead of a generic "something went wrong".

## File structure

```
├── index.html            # login + admin + dealer views, one page
├── css/
│   └── style.css          # design system + responsive rules + view toggling
├── js/
│   ├── config.js           # Supabase URL + publishable key
│   ├── supabaseClient.js   # client singleton
│   ├── utils.js             # click-guard, toasts, session, switchView(), friendlyError()
│   ├── auth.js               # wireLoginView()
│   ├── admin.js              # wireAdminView() + loadAdminData()
│   ├── dealer.js             # wireDealerView() + loadDealerData()
│   └── app.js                 # boot: wires everything, routes to the right view
├── assets/
│   └── favicon.svg
├── schema.sql             # run once in Supabase SQL editor
└── README.md
```
