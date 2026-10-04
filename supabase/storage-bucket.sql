-- P3 community storage repair
-- Run the two numbered migrations first. This file is safe to rerun and
-- makes the private bucket visible in Supabase Storage.

begin;

insert into storage.buckets(
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'community',
  'community',
  false,
  20971520,
  array['application/octet-stream']
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
