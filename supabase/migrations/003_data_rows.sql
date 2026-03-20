-- Store parsed spreadsheet rows directly in the project
alter table public.projects add column if not exists data_rows jsonb not null default '[]'::jsonb;
