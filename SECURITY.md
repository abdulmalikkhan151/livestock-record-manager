# Security Policy

Do not commit `.env.local`, Supabase service-role keys, Owner passwords, setup codes, backup files or real animal attachments.

For production incidents:

1. Disable the affected staff profile or reset the Owner password.
2. Revoke exposed Supabase/Vercel tokens and rotate environment secrets.
3. Review Supabase Auth logs, Vercel logs and `activity_logs`.
4. Preserve an incident backup before changing records.
5. Redeploy only from the Owner-controlled repository.

Report software vulnerabilities privately to the technical Owner rather than opening a public issue containing farm data or credentials.
