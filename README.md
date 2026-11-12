# Fleet Daily — demo prototype

Drivers enter their machine meter readings from their phone during the day. Next morning the owner opens the **Morning Report** and sees every machine in one place: who worked, who was idle, which machines broke down and who forgot to enter data.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · PWA · Vercel.

---

## 1. Setup (about 15 minutes)

You need **Node.js 20+**, a free [Supabase](https://supabase.com) account and a free [Vercel](https://vercel.com) account.

### 1.1 Create the Supabase project
1. Supabase dashboard → **New project**. Region: **South Asia (Mumbai)**. Save the database password somewhere.
2. Wait until the project is ready.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secret)

### 1.2 Run the migrations
1. Supabase dashboard → **SQL Editor → New query**.
2. Paste the full contents of [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) and click **Run**.
   This creates all tables, Row Level Security policies, helper functions, the `photos` storage bucket and its policies.
3. Do the same with [`supabase/migrations/002_owner_close_breakdowns.sql`](supabase/migrations/002_owner_close_breakdowns.sql). It lets the owner mark breakdowns as fixed, and it is safe to run more than once.

   (With the Supabase CLI instead: `supabase link` then `supabase db push`.)

### 1.3 Check the storage bucket
The migration already creates the bucket. Open **Storage** and confirm there is a bucket called **`photos`** with **Public = OFF**.
If it is missing, click **New bucket**, name it `photos`, leave "Public bucket" unticked and save. The storage policies from the migration apply to it automatically.

### 1.4 Auth settings
Supabase dashboard → **Authentication → Sign In / Providers → Email**:
- **Turn off Confirm email** in Supabase Auth settings. Users log in with mobile + PIN and never receive email. The seed already creates every user with `email_confirm: true`, so this is a safety net for users added later.
- Optional: turn off **Allow new users to sign up**. All users are created by the seed or by the admin.

### 1.5 Configure environment variables
```bash
cp .env.example .env.local
```
Fill in the three values from step 1.1.

### 1.6 Install and seed
```bash
npm install
npx tsx scripts/seed.ts     # or: npm run seed
```
The seed prints every login at the end. **All PINs are `1234`.** Owner: `9999999999`.

> ⚠️ Seed data is relative to **today's date**. Re-run the seed on the morning of the demo (or the evening before) so that "yesterday" has the right story. Re-running deletes the old demo data and starts clean.

### 1.7 Run locally
```bash
npm run dev
```
Open http://localhost:3000. To try it on a phone on the same Wi-Fi: `npm run dev -- -H 0.0.0.0` and open `http://<your-PC-IP>:3000` on the phone.

### 1.8 Deploy to Vercel
1. Push this folder to a GitHub repository.
2. Vercel → **Add New → Project** → import the repository (framework is detected as Next.js).
3. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. Only the local seed script uses it.
4. Click **Deploy**. You will get a URL like `https://fleet-daily.vercel.app`.

### 1.9 Add to the phone home screen
- **Android (Chrome):** open the Vercel URL → ⋮ menu → **Add to Home screen** / **Install app**.
- **iPhone (Safari):** open the URL → Share button → **Add to Home Screen**.

The app opens full-screen with the Fleet Daily icon. Drivers log in once and stay logged in.

---

## 2. Demo script (7 steps)

Use two phones (or one phone plus a laptop), one as the driver and one as the owner.

| # | Who | What to show |
|---|-----|--------------|
| 1 | Driver | Log in with **9876500001 / 1234** (Santosh Pawar, EX-01). Switch the language to **मराठी** and back. The home screen shows only *his* machine, today's status and the last 3 entries. |
| 2 | Driver | **Start Shift** shows yesterday's closing reading as a hint. Type a different number to show the mismatch warning, then the correct one. Take a meter photo → submit → "Shift started ✓". Home now shows *Shift running*. |
| 3 | Driver | **End Shift**: enter a closing reading lower than the opening to show it is blocked. Enter a correct reading → the worked hours appear live. Enter diesel 90 L, tap ✅ Worked, take a photo → submit. |
| 4 | Driver | **Breakdown** (red): take a photo, type "Track chain loose" → submit. |
| 5 | Owner | Log in with **9999999999 / 1234**. The Morning Report opens on **yesterday**: open breakdowns at the top in red (JCB-02 from the seed plus the one just reported), the Worked / Idle / Breakdown / **Missing** counts, total hours, km and diesel. Tap **✓ Mark fixed** on the JCB-02 breakdown and it disappears from the list. Under **Missing entries**, TP-03 and RL-01 have a 📞 call button. Use **›** to move to **today** and show EX-01's fresh entry with its photo (tap to enlarge). |
| 6 | Owner | Tap any machine card to open its **30-day history**: opening → closing, hours/km, diesel, status, start/end photos and its breakdowns. |
| 7 | Owner | Back on the report, tap **Share on WhatsApp**. A ready-made summary opens in WhatsApp, ready to forward to the site manager. |

---

## 3. Folder structure

```
supabase/migrations/001_init.sql   Tables, RLS, helper functions, storage bucket + policies
supabase/migrations/002_…sql       Owner-only update policy on breakdowns (Mark fixed)
scripts/check-dates.ts             npm run check:dates: proves today/yesterday use India time
scripts/seed.ts                    Demo data (company, sites, 10 machines, 11 users, 7 days of logs)
public/                            sw.js (service worker) and icons/
src/proxy.ts                       Session refresh + login/role redirects (Next 16's "middleware")
src/app/
  login/                           Mobile + PIN login with a language switch
  driver/                          Home, start/, end/, breakdown/
  owner/                           Morning Report, machine/[id]/ history
  manifest.ts                      PWA manifest
src/lib/
  auth.ts                          Mobile/PIN → Supabase email/password mapping (demo only)
  supabase/client.ts               Browser Supabase client
  driver.ts / owner.ts             Data loading for the driver and owner screens
  photos.ts                        Client-side compression, upload, signed URLs
  date.ts                          Asia/Kolkata date helpers
  i18n/                            en.json, mr.json, hi.json and the t() hook
src/components/                    Small shared UI pieces
```

## 4. How it works (short)

- **Login (demo only):** mobile `9876500001` becomes `9876500001@fleet.local` and PIN `1234` becomes password `1234-fleet` in Supabase Auth. Users only ever see "Mobile number" and "PIN". This will be replaced with real SMS OTP login.
- **Security:** every table has Row Level Security. A driver can only read his own profile and machine, and only write his own shift logs and breakdowns. The owner reads everything with his `company_id`. `security definer` helper functions (`app_role()`, `app_company_id()`, `app_machine_id()`, `is_owner_of()`) avoid recursive RLS on `profiles`.
- **Photos:** compressed in the browser to ~300 KB, uploaded to the private `photos` bucket at `<company_id>/<machine_id>/…`, and shown to the owner through 1-hour signed URLs.
- **Dates:** all business dates are India dates (Asia/Kolkata).

## 5. Assumptions

Wherever the spec was open, I chose the simplest option:

1. **One shift per machine per day** (enforced by a unique constraint). After a shift is ended, Start Shift stays disabled until the next day.
2. If a driver **forgot to end yesterday's shift**, End Shift closes that open shift (its date is shown) and Start Shift stays disabled until it is closed.
3. **Meter photos are optional** so a weak site network never blocks a reading. The owner sees "No photo" when one is missing.
4. **Missing** means an active machine with no *completed* (ended) log for that date. A shift that was started but never ended counts as missing and is labelled "shift not ended".
5. **Mark fixed** (owner only) sets the breakdown's `status` to `closed`. It is available on the Morning Report and the machine history. Drivers can create breakdowns but cannot change them.
6. Choosing ⚠️ **Breakdown as the End Shift status** only marks that day's log. The red Breakdown button is what creates a `breakdowns` record.
7. **Role routing** uses `app_metadata.role` (set by the seed). The database permissions use `profiles.role`. When adding users by hand, set both.
8. **Driver language** is chosen on the login or home screen and remembered on the phone. Before the driver chooses, it follows the profile's `preferred_language`. The login screen defaults to Marathi. The owner screens are English only.
9. Seeded shift logs have **no photos**.
10. `companies.company_id` equals the company's own `id` (the spec asks for `company_id` on every table).
11. The service worker is network-only (no offline mode). It exists so the app can be installed.
12. Next.js 16 renamed `middleware.ts` to `proxy.ts`. "Cache Components" is switched off so entry forms always start fresh.
