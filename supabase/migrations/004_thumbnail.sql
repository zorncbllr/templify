-- Store a small base64 thumbnail of the template preview
alter table public.projects add column if not exists thumbnail text;
