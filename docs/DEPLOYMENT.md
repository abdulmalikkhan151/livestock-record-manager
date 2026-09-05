# Deployment Guide

This guide creates an independent production system owned by one person. The Owner and staff will use the custom website link; they will not need ChatGPT.

## 1. Create accounts in the final Owner's name

The final technical Owner should personally control:

1. Domain registrar account
2. GitHub account/repository
3. Vercel account/team
4. Supabase organization/project
5. Recovery email and two-factor authentication

Do not share the Owner's passwords. Add a developer as a limited collaborator only when future changes are needed.

## 2. Create the Supabase backend

1. Create a new Supabase project in the Owner's organization.
2. Open the SQL editor.
3. Run the complete file `supabase/migrations/0001_initial.sql` once.
4. Confirm these tables exist: `profiles`, `farms`, `animals`, all history tables, `staff_invitations` and `activity_logs`.
5. Confirm the private Storage bucket `animal-files` exists.
6. Copy the project URL, anon key and service-role key from the project API settings.

The service-role key is highly sensitive. Keep it only in Vercel environment variables and the Owner's password manager.

## 3. Put the source code in GitHub

Create a private repository under the final Owner's GitHub account and push this project. Confirm `.env.local`, service keys, backup downloads and animal photos are not committed.

## 4. Deploy to Vercel

1. Import the Owner's private GitHub repository into the Owner's Vercel account/team.
2. Keep the detected framework as Next.js.
3. Add all four values from `.env.example` to the Production, Preview and Development environments as appropriate.
4. Deploy.
5. Open `/api/health`; it should return `ok: true`.

## 5. Create the first Owner

1. Open `https://YOUR-VERCEL-URL/setup`.
2. Enter Owner name, farm name, Owner email, strong password and the private `OWNER_SETUP_CODE`.
3. The system creates the only initial Owner and signs in.
4. Keep `/setup` in the code: after the first profile exists it is automatically locked.
5. Rotate `OWNER_SETUP_CODE` in Vercel after successful setup, then redeploy.

## 6. Connect the custom domain

1. Purchase the domain inside the final Owner's registrar account.
2. Add the domain to the Vercel project.
3. Add the DNS record shown by Vercel at the registrar.
4. Wait for domain and SSL verification.
5. In Supabase Auth URL settings, set the production Site URL to the custom HTTPS domain and add the Vercel preview URL only if previews need login testing.

## 7. Test before entering real records

- Owner can log in and out.
- Owner can add and edit a cow, buffalo, goat and camel.
- Photo and old WhatsApp/PDF attachment open correctly.
- Search and filters work.
- Weight, health, expense and sale entries save.
- Complete, filtered and individual PDF reports download.
- Data backup downloads only for Owner.
- Staff invitation link works in a private/incognito browser.
- Staff can view everything but cannot see add/edit controls.
- Disabled staff cannot regain access with the old session.
- Android and iPhone can add the site to the home screen.

Delete the test records after verification.

### Updating an existing live website to support camels

If `0001_initial.sql` was already run before Camel support was added:

1. Open the Supabase SQL Editor.
2. Run `supabase/migrations/0002_add_camel.sql` once.
3. Push the updated code to the GitHub `main` branch.
4. Wait for Vercel to deploy, then refresh the website.

The existing animal records remain unchanged.

## 8. Staff onboarding

1. Owner opens **Team access**.
2. Owner enters staff name and email and creates an invitation.
3. Owner copies the private link and sends it on WhatsApp.
4. Staff opens the link, sets a password and logs in.
5. Staff uses browser **Install app / Add to Home Screen**.

The link expires after seven days and can be cancelled. A copied app icon is harmless without an approved login.

## 9. Backup routine

- Weekly: Owner downloads the JSON data backup from Reports.
- Monthly: Export/backup Supabase Storage objects and verify at least one recent animal photo.
- Before every major code/database update: take database and Storage backups.
- Keep one encrypted copy outside the hosting accounts.
- Never store service keys inside a backup folder shared with staff.

## 10. Future updates

A developer works in a branch or pull request in the Owner's GitHub repository. Vercel creates a preview. The Owner tests it, then merges to production. Database changes must be new numbered migration files; never edit an already-applied production migration.
