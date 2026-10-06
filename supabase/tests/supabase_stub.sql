-- =============================================================================
-- Minimal emulation of the Supabase environment (roles, auth schema, auth.uid())
-- so migrations and rule tests can run on a plain PostgreSQL server (CI).
-- NOT a migration: never apply this to a real Supabase project.
-- =============================================================================
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
grant usage on schema auth to anon, authenticated;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table auth.users (
  instance_id uuid, id uuid primary key default gen_random_uuid(), aud text, role text,
  email text, encrypted_password text, email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz, updated_at timestamptz, confirmation_token text,
  email_change text, email_change_token_new text, recovery_token text
);
create table auth.identities (
  id uuid primary key, user_id uuid references auth.users(id), provider_id text, identity_data jsonb,
  provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
