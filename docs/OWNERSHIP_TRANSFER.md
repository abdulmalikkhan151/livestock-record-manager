# Complete Technical Ownership Transfer

Use this checklist when the system is handed to another technical Owner.

## Accounts that must belong to the new Owner

| Asset | Required final state |
| --- | --- |
| Domain | Registrant, billing, recovery email and 2FA controlled by new Owner |
| GitHub | Private repository owned by new Owner or their organization |
| Vercel | Project and billing owned by new Owner/team |
| Supabase | Organization/project and billing owned by new Owner |
| Application | New Owner has the `owner` application role |
| Secrets | New Owner stores recovery codes and rotated keys securely |

## Safe transfer order

1. New Owner creates or confirms all accounts and enables 2FA.
2. Transfer the private GitHub repository.
3. Transfer or recreate the Vercel project in the new Owner's team.
4. Transfer the Supabase organization/project using supported account controls; if direct transfer is unavailable, migrate the database and Storage into a new project.
5. Transfer the domain last, after the new deployment is verified.
6. Update DNS to the verified Vercel project.
7. Rotate the Supabase service-role key exposure, Owner setup code and any deployment tokens.
8. Verify Owner login, staff login, records, photos, reports, backup and PWA installation.
9. Remove the old Owner/developer from GitHub, Vercel, Supabase and the registrar only after verification.

## Application Owner change

Changing only the application role is not a complete technical transfer. The infrastructure accounts above must also move.

For a planned application-Owner change, use a controlled database migration performed by an authorized developer:

1. Create the new person's Supabase Auth user.
2. Add their profile to the same farm as `owner`.
3. Change the old application Owner to `staff` or deactivate it.
4. Update `farms.owner_id` to the new Auth user ID.
5. Record the change in `activity_logs`.

Do not perform these SQL changes from a public browser or send service keys through WhatsApp.

## Final acceptance evidence

The new Owner should retain:

- Custom production URL
- Repository link and latest production commit
- Vercel project link
- Supabase project reference
- Latest JSON/data and Storage backup date
- List of active staff accounts
- Date secrets were last rotated
- A successful mobile and desktop login test

After acceptance, the previous technical Owner should no longer possess production credentials or recovery codes.
