-- ─── Profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_quarterly', 'pro_annual')),
  plan_expires_at timestamptz,
  payment_gateway text check (payment_gateway in ('paymongo', 'stripe')),
  gateway_customer_id text,
  gateway_subscription_id text,
  locale text not null default 'ph' check (locale in ('ph', 'intl')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile when user signs up (populates name + avatar from Google OAuth metadata)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at on any row change
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

-- Column-level grant: users may only update safe profile fields.
-- Payment fields (plan, plan_expires_at, payment_gateway, gateway_*) are
-- modified exclusively by the admin client in webhook/cron handlers.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);


-- ─── Projects ─────────────────────────────────────────────────────────────────

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Untitled Project',
  objects jsonb not null default '[]'::jsonb check (pg_column_size(objects) < 1048576),
  canvas_width integer not null default 960 check (canvas_width between 1 and 10000),
  canvas_height integer not null default 540 check (canvas_height between 1 and 10000),
  columns jsonb default '[]'::jsonb check (pg_column_size(columns) < 65536),
  data_images_label text,
  data_file_path text,
  paper_size text not null default 'a4',
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

alter table public.projects enable row level security;

create policy "Users can read own projects"
  on public.projects for select using (auth.uid() = user_id);

create policy "Users can insert projects (free: max 3)"
  on public.projects for insert with check (
    auth.uid() = user_id and (
      (select plan from public.profiles where id = auth.uid()) != 'free'
      or (select count(*) from public.projects where user_id = auth.uid()) < 3
    )
  );

create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);


-- ─── Payments ─────────────────────────────────────────────────────────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gateway text not null check (gateway in ('paymongo', 'stripe')),
  gateway_payment_id text not null unique,
  gateway_subscription_id text,
  amount integer not null,
  currency text not null check (currency in ('PHP', 'USD')),
  plan text not null check (plan in ('pro_monthly', 'pro_quarterly', 'pro_annual')),
  status text not null check (status in ('succeeded', 'failed', 'refunded')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can read own payments"
  on public.payments for select using (auth.uid() = user_id);


-- ─── Storage Buckets ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('templates', 'templates', true);
insert into storage.buckets (id, name, public) values ('data-files', 'data-files', false);

-- Templates: public read, authenticated upload/delete within own folder
create policy "Anyone can read templates"
  on storage.objects for select using (bucket_id = 'templates');

create policy "Users can upload templates to own folder"
  on storage.objects for insert with check (
    bucket_id = 'templates' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own templates"
  on storage.objects for delete using (
    bucket_id = 'templates' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Data files: private (owner only)
create policy "Users can read own data files"
  on storage.objects for select using (
    bucket_id = 'data-files' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload data files to own folder"
  on storage.objects for insert with check (
    bucket_id = 'data-files' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own data files"
  on storage.objects for delete using (
    bucket_id = 'data-files' and auth.uid()::text = (storage.foldername(name))[1]
  );
