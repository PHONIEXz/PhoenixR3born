-- Apply after 202609300001 and 202609300002. Storage retains objects until
-- the uploader removes them through the Storage API. Keep the bucket private.
begin;

update storage.buckets
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = null
where id = 'community';

-- Storage deletion checks the JWT owner, even for an approved resource.
alter policy community_cleanup on storage.objects
using (bucket_id = 'community' and owner_id = auth.uid()::text);

-- The uploader may delete their listing after deleting the Storage object.
grant delete on public.submissions to authenticated;
create policy submissions_owner_delete on public.submissions
for delete to authenticated using (author_id = auth.uid());

commit;
