-- =============================================================================
-- Workflow · 010 · Forced password change for new / reset accounts (D-023)
--
-- Administrators create users with a temporary password and set
-- must_change_password = true; the app sends the user to change it before
-- anything else. Users may only clear their own flag (after changing the
-- password); only users.manage can set it.
-- =============================================================================

alter table public.profiles
  add column must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'True after an administrator sets a temporary password; cleared when the user chooses a new one.';

grant update (must_change_password) on public.profiles to authenticated;

create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role_code is distinct from old.role_code or new.is_active is distinct from old.is_active then
    if not public.has_permission('users.manage') then
      raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario.'
        using errcode = '42501';
    end if;
    if new.id = auth.uid() then
      raise exception 'No puede cambiar su propio rol ni desactivar su propio usuario.'
        using errcode = 'P0001';
    end if;
  end if;

  if new.must_change_password and not old.must_change_password
     and not public.has_permission('users.manage') then
    raise exception 'Solo un administrador puede exigir un cambio de contraseña.'
      using errcode = '42501';
  end if;

  new.email := old.email; -- email is synchronised from auth.users only
  return new;
end;
$$;
