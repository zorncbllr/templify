-- ─── Add storage_used to profiles ─────────────────────────────────────────────

alter table public.profiles add column if not exists storage_used bigint not null default 0;

-- ─── Update plan check constraints to include business plans ─────────────────

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'pro_monthly', 'pro_quarterly', 'pro_annual', 'biz_monthly', 'biz_quarterly', 'biz_annual'));

alter table public.payments drop constraint if exists payments_plan_check;
alter table public.payments add constraint payments_plan_check
  check (plan in ('pro_monthly', 'pro_quarterly', 'pro_annual', 'biz_monthly', 'biz_quarterly', 'biz_annual'));

-- ─── Update currency constraint (PHP only now) ──────────────────────────────

alter table public.payments drop constraint if exists payments_currency_check;
alter table public.payments add constraint payments_currency_check
  check (currency in ('PHP'));

-- ─── Create data-images storage bucket (private, owner only) ─────────────────

insert into storage.buckets (id, name, public)
values ('data-images', 'data-images', false)
on conflict (id) do nothing;

create policy "Users can read own data images"
  on storage.objects for select using (
    bucket_id = 'data-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload data images to own folder"
  on storage.objects for insert with check (
    bucket_id = 'data-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own data images"
  on storage.objects for delete using (
    bucket_id = 'data-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── RPC to atomically update storage_used ───────────────────────────────────

create or replace function public.update_storage_used(delta bigint)
returns void as $$
begin
  update public.profiles
  set storage_used = greatest(0, storage_used + delta)
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- Allow authenticated users to update their own storage_used via this RPC
grant update (storage_used) on public.profiles to authenticated;

-- ─── Update project insert policy for business plans ─────────────────────────

drop policy if exists "Users can insert projects (free: max 3)" on public.projects;

create policy "Users can insert projects (free: max 3)"
  on public.projects for insert with check (
    auth.uid() = user_id and (
      (select plan from public.profiles where id = auth.uid()) not in ('free')
      or (select count(*) from public.projects where user_id = auth.uid()) < 3
    )
  );
