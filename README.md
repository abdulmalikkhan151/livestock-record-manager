# Livestock Record Manager

An independent, installable livestock management website for cows, buffaloes, goats and camels. It runs on Vercel, stores private records in Supabase and does not require ChatGPT for the Owner or staff.

## Included

- Separate Owner and Staff logins
- Owner-only animal creation, editing and history updates
- Read-only Staff access that the Owner can disable at any time
- Private staff invitation links that can be shared through WhatsApp
- Cow, buffalo, goat and camel profiles with photos
- Seller, purchase price/date, starting weight, breed, location and notes
- Search by tag, name, breed, seller or location
- Weight, vaccination, treatment, checkup, expense and sale history
- Complete, filtered and individual animal PDF reports
- Owner JSON data backup
- Private photo/document storage with signed links
- Audit log foundation for important actions
- Installable Android/iPhone PWA
- Responsive desktop and mobile design
- Row-level database security and server-side role checks

## Technology

- Next.js + TypeScript
- Vercel hosting
- Supabase Postgres, Auth and private Storage
- Progressive Web App manifest and service worker

## Local development

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local` and add real values.
3. Run the SQL file at `supabase/migrations/0001_initial.sql` in a new Supabase project.
4. Install and start:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/setup` once to create the first Owner. After the Owner exists, `/setup` refuses to create another one.

## Required environment variables

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Safe browser API key protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server administration; never expose or commit |
| `OWNER_SETUP_CODE` | Secret | One-time code for initial Owner creation |

Generate the setup code with a password manager or a random string of at least 24 characters.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deployment and ownership

Read [DEPLOYMENT.md](docs/DEPLOYMENT.md) for Supabase, GitHub, Vercel, domain and first-login steps. Read [OWNERSHIP_TRANSFER.md](docs/OWNERSHIP_TRANSFER.md) before handing the system to another person.

## Security rules

- Staff accounts can read records but cannot create or update them.
- API routes independently enforce the Owner role.
- Supabase Row Level Security provides a second permission layer.
- Animal photos and attachments are stored in a private bucket.
- Authenticated pages and API responses are never cached by the PWA service worker.
- The service role key belongs only in Vercel/Supabase secrets, never in source code.

## Backups

The Owner can download a structured JSON backup from **Reports → Owner data backup**. PDF reports are for reading/sharing; JSON is the recovery-friendly data export. Private Storage files should also be included in the Supabase backup routine described in [DEPLOYMENT.md](docs/DEPLOYMENT.md).
