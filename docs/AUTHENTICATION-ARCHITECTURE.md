# Authentication and cloud progress architecture

## Decision

Use **Supabase Auth + PostgreSQL with Row Level Security (RLS)** for the first account-backed version of Central Forense. The current app remains a Vite static site; Supabase provides the identity and data services without requiring a custom server for the initial learning-progress feature.

The Free plan is suitable for a prototype and small pilot, subject to current quotas and inactivity behavior. Supabase currently lists two active Free projects, a 500 MB database, and automatic pausing after one week of inactivity. Re-check the official pricing page before launch or any paid commitment:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase

## Data model

Migration `supabase/migrations/20261109000100_study_progress.sql` creates one row per authenticated user and reference body:

- `user_id`: Supabase Auth UUID, defaulted from `auth.uid()`.
- `reference_body`: `male` or `female`.
- `completed_concepts`: completed guided-study concept IDs.
- `mastered_questions`: mastered assessment concept IDs.
- `updated_at`: server-maintained timestamp.

The composite primary key `(user_id, reference_body)` keeps the two reference histories separate.

## Security model

- RLS is enabled on the progress table.
- Only the `authenticated` role receives table privileges; `anon` receives none.
- Separate SELECT, INSERT, UPDATE, and DELETE policies require the row owner to equal `auth.uid()`.
- INSERT and UPDATE checks prevent a client from assigning another student's UUID.
- Deleting an Auth user cascades to that user's progress.
- Never ship a Supabase `service_role` secret or database password in browser code.
- The browser may use only the project's publishable key (or legacy anon key if the dashboard has not migrated), and only after RLS is enabled and tested.

Supabase RLS reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Required project setup (not performed by this PR)

1. Create a Supabase project in the user's own account; do not put credentials in GitHub.
2. Apply the SQL migration in the Supabase SQL Editor or with the Supabase CLI.
3. Verify RLS is enabled and test that student A cannot read, change, or delete student B's row.
4. Configure the allowed site URL and redirect URLs for the actual preview and production domains.
5. Choose the sign-in method. Recommended first pilot: email one-time password / magic link, avoiding password handling in the app.
6. Add the public environment variables to the hosting provider:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Only then add the browser client, sign-in UI, session handling, cloud progress sync, and a clear sign-out action.

## Not included yet

This is a backend schema and security foundation, not a live account system. No Supabase project was created, no credentials were generated, no login UI was connected, and no student data was uploaded. The existing local-browser progress remains the fallback until the authenticated sync is implemented and tested.

## Release gate

Before enabling cloud sync:
- Apply and inspect the migration in a disposable Supabase project.
- Run automated RLS tests for two separate users and anonymous access.
- Confirm a user cannot spoof `user_id` on INSERT or UPDATE.
- Test session expiry, sign-out, email confirmation/OTP redirect, and network failure.
- Test migration and restore behavior before using real student records.
