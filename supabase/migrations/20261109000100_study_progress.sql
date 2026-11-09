-- Central Forense: authenticated study progress
-- Apply only after creating a Supabase project and reviewing this migration.
create table if not exists public.study_progress (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  reference_body text not null
    check (reference_body in ('male', 'female')),
  completed_concepts text[] not null default '{}',
  mastered_questions text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint study_progress_user_reference_pk
    primary key (user_id, reference_body)
);

comment on table public.study_progress is
  'Private learning progress for one authenticated student and one anatomical reference.';
comment on column public.study_progress.user_id is
  'Owner, always derived from the authenticated Supabase identity.';
comment on column public.study_progress.reference_body is
  'Atlas reference key: male or female.';
comment on column public.study_progress.completed_concepts is
  'Concept IDs completed in the guided study route.';
comment on column public.study_progress.mastered_questions is
  'Concept IDs mastered in the guided assessment.';

alter table public.study_progress enable row level security;

revoke all on table public.study_progress from anon, authenticated;
grant select, insert, update, delete on table public.study_progress to authenticated;

drop policy if exists "Students read their own study progress"
  on public.study_progress;
create policy "Students read their own study progress"
  on public.study_progress for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Students create their own study progress"
  on public.study_progress;
create policy "Students create their own study progress"
  on public.study_progress for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Students update their own study progress"
  on public.study_progress;
create policy "Students update their own study progress"
  on public.study_progress for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Students delete their own study progress"
  on public.study_progress;
create policy "Students delete their own study progress"
  on public.study_progress for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.set_study_progress_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_study_progress_updated_at
  on public.study_progress;
create trigger set_study_progress_updated_at
  before update on public.study_progress
  for each row execute function public.set_study_progress_updated_at();
