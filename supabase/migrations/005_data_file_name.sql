-- Store the original Excel/CSV filename for display in the editor
alter table public.projects add column if not exists data_file_name text;
