# RLS verification checklist — study_progress

Run these checks in a disposable Supabase project before connecting the frontend.

## Identities

Create two confirmed test users, A and B, using Supabase Auth. Keep their credentials outside the repository.

## Required assertions

1. An anonymous request cannot SELECT, INSERT, UPDATE, or DELETE rows in `public.study_progress`.
2. User A can insert one row for `male` with `user_id` omitted; the database fills it from `auth.uid()`.
3. User A can read and update their own `male` row.
4. User A can create a separate `female` row.
5. User B cannot read either of A's rows.
6. User B cannot update or delete A's rows.
7. User B cannot insert a row while explicitly setting A's UUID as `user_id`.
8. User A cannot change the `user_id` to B's UUID during UPDATE.
9. Deleting A from Auth removes A's progress rows through the foreign-key cascade.
10. Updating a row refreshes `updated_at`.

Use Supabase's official RLS testing guidance and pgTAP where available:
https://supabase.com/docs/guides/database/postgres/row-level-security

Do not treat a successful frontend login as proof that database isolation works. The RLS tests are a release requirement.
