-- Owner can mark breakdowns as fixed (status = 'closed'); drivers can no longer update them.
-- Safe to run on any database that already has 001_init.sql (re-runnable).

drop policy if exists breakdowns_update_driver on public.breakdowns;
drop policy if exists breakdowns_update_owner on public.breakdowns;

create policy breakdowns_update_owner on public.breakdowns for update to authenticated
  using (public.is_owner_of(company_id))
  with check (public.is_owner_of(company_id));

grant update on public.breakdowns to authenticated;
