# J Flash Scholars website

**Status: Phase 1 of 6 (foundation).** What works now: registration, email verification, login, password reset, a basic aspirant dashboard, and a protected admin login. The full public pages, admin tools, and tests come in the next phases.

Everything runs on free plans: **GitHub** (stores the code), **Supabase** (database and logins), **Vercel** (puts the site online). Do the steps in order. Take your time. Nothing here can break anything permanently.

---

## Step 1: GitHub (store the code)

1. Go to github.com and create a **personal** account (not an organization). Vercel's free plan cannot use organization repositories.
2. Click **+ → New repository**. Name it `jflash`. Choose **Private**. Click **Create repository**.
3. Unzip the file you downloaded. On the new repository page click **uploading an existing file**, then drag in **everything inside the unzipped folder** (the folders `api`, `admin`, `css`, `img`, `js`, `supabase` and the loose files). Click **Commit changes**.
4. Check the repository now shows those folders, and that `package.json` and `vercel.json` are at the top level, not inside another folder.

## Step 2: Supabase (database and logins)

1. Go to supabase.com, sign up, click **New project**.
2. Name: `jflash`. Choose a strong database password and **save it somewhere safe**. Pick the region closest to Nigeria that is offered (Europe or Africa if listed). Click **Create new project** and wait a couple of minutes.

## Step 3: Set up the database

1. In Supabase, open **SQL Editor → New query**.
2. On GitHub, open `supabase/migrations/001_foundation.sql`, click the copy icon, paste it into Supabase, click **Run**. You should see "Success".

## Step 4: Connect the site to Supabase

1. In Supabase open **Project Settings → API** (or **API Keys**). You need two things:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - The **public** key, called **anon** or **publishable**. This one is safe to put on the website.
2. On GitHub, open `js/config.js`, click the pencil icon, replace the two `PASTE_...` values with these, then **Commit changes**.

> **Never** put the **secret** key (called `service_role` or `secret`) in this file. It goes only into Vercel, in Step 5.

## Step 5: Put the site online with Vercel

1. Go to vercel.com and sign up **with your GitHub account**.
2. Click **Add New → Project**, pick the `jflash` repository, click **Import**.
3. Leave the settings as they are (Framework: **Other**, no build command). Open **Environment Variables** and add two:
   - `SUPABASE_URL` = your Project URL from Step 4
   - `SUPABASE_SERVICE_ROLE_KEY` = the **secret** key from the same Supabase page
4. Click **Deploy**. When it finishes, Vercel shows your site address, like `https://jflash-xxxx.vercel.app`. Open it. You should see the J Flash Scholars page.

## Step 6: Tell Supabase your site address

In Supabase open **Authentication → URL Configuration**:
- **Site URL**: your Vercel address.
- **Redirect URLs**: add your Vercel address followed by `/**`, for example `https://jflash-xxxx.vercel.app/**`.
- Click **Save**.

Then open the **Email** sign-in settings (under Authentication → Sign In / Providers) and make sure **Confirm email** is **on**. If there is a minimum password length, set it to 8.

## Step 7: Make yourself the admin

1. On your site, click **Register** and create your own account using your real email. Open the verification link in your inbox, then log in once.
2. In Supabase **SQL Editor**, run this (use your own email):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## Step 8: Check that it works

- [ ] Registering a new account sends a verification email (see the note below).
- [ ] After verifying, **Log in** takes you to your dashboard.
- [ ] **Forgot your password?** sends a reset link that lets you set a new password.
- [ ] Opening `/admin` and logging in with your admin account shows "Your admin login works".
- [ ] Logging in at `/admin` with a normal (non-admin) account is refused.

Tell me what you see (a screenshot is perfect) and I will move on to Phase 2.

---

## Important note about emails (for now)

Until Phase 5, Supabase sends the verification and reset emails itself. Its built-in sender is only meant for testing: it allows just a few emails per hour and may deliver only to your own address. If a test email does not arrive:

1. Wait a few minutes and check spam.
2. Or skip email for testing: in Supabase open **Authentication → Users → Add user → Create new user**, enter an email and password, and tick **Auto Confirm User**. That account can log in straight away.

Real aspirants cannot register until you own `jflashscholars.com` and we connect it to Resend (Phase 5). That is the one launch blocker.

## What is in this folder

| Folder or file | What it is |
|---|---|
| `index.html`, `register.html`, `login.html`, `reset.html`, `dashboard.html` | The pages people see |
| `admin/index.html` | The admin area (login is checked on the server, not just on the page) |
| `api/` | The server-side code. `admin.js` handles admin-only actions |
| `css/style.css` | All styling. Brand colors are at the top |
| `js/config.js` | The two Supabase values you fill in (Step 4) |
| `img/` | Logo and favicon (placeholders cropped from your brand board; send originals when you can) |
| `supabase/migrations/` | Database setup, run in Step 3 |
| `.env.example` | Shows which secret values Vercel needs (do not put real keys here) |
"# jflash_scholar" 
