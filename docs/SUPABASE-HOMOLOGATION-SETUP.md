# Supabase authentication and cloud study progress

## Browser environment

Configure these variables in the Cloudflare Pages project settings for the Human Atlas homologation deployment:

- `VITE_SUPABASE_URL`: the project URL from the Supabase API settings.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the public publishable key from the Supabase API settings.

These are public browser variables. Never configure or expose a `service_role` key, an `sb_secret_` key, or the database password in the frontend.

After changing build environment variables, trigger a new Pages build/deployment. The app deliberately displays a configuration notice and keeps local progress when the variables are absent.

## Supabase Auth URL configuration

For the homologation deployment, set the Site URL to the deployed Pages origin and add that origin as an allowed Redirect URL. Add exact production origins separately when production is ready. Do not use a wildcard broader than the project's actual deployment scope.

Email provider should be enabled and email confirmation should remain enabled. The app sends a passwordless email link with `emailRedirectTo: window.location.origin`.

## Progress synchronization

The browser keeps its existing local progress fallback. Once a student signs in, the app loads the cloud row for the selected reference body. Cloud progress is treated as account-specific and replaces the in-memory progress for that signed-in account; anonymous browser progress is not silently imported into a student's account. Changes are upserted using the authenticated session and the unique key `(user_id, reference_body)`.

The database RLS policies must remain enabled. The browser client uses only the publishable key; ownership is enforced by `auth.uid()` policies.

## Homologation checklist

1. Configure the two public environment variables in Cloudflare Pages.
2. Redeploy the homologation site.
3. Create two separate test student accounts and confirm both emails.
4. Sign in as student A, mark a concept complete, and confirm the row appears in `study_progress`.
5. Sign in as student B and verify student A's progress is not visible.
6. Sign back in as student A and verify the progress returns.
7. Repeat for both male and female reference bodies.
8. Do not load real student records until the two-account isolation test passes.

This PR does not merge itself, change production, or configure Cloudflare/Supabase account settings.
