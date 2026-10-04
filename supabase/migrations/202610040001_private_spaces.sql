-- Private sharing is enforced in Postgres and Storage, including direct API calls.
begin;
alter table public.submissions add column if not exists visibility text not null default 'private' check(visibility in ('private','public'));
grant insert(visibility), update(visibility) on public.submissions to authenticated;
alter policy submissions_read on public.submissions using (
 author_id=auth.uid() or (visibility='public' and (moderation_status='approved' or private.is_moderator()))
);
alter policy submissions_moderate on public.submissions using (visibility='public' and private.is_moderator()) with check (visibility='public' and private.is_moderator());
create policy submissions_owner_sharing on public.submissions for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create or replace function private.guard_sharing() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.id<>old.id or new.author_id<>old.author_id or new.file_path is distinct from old.file_path then raise exception 'Resource ownership and file paths cannot change.'; end if;
 if new.visibility is distinct from old.visibility then
  if old.author_id<>auth.uid() then raise exception 'Only the uploader can change sharing.'; end if;
  new.moderation_status:='pending';
 elsif new.moderation_status is distinct from old.moderation_status then
  if not private.is_moderator() or new.visibility<>'public' then raise exception 'Only moderators can review public submissions.'; end if;
 end if;
 return new;
end; $$;
revoke all on function private.guard_sharing() from public;
create trigger guard_sharing before update on public.submissions for each row execute function private.guard_sharing();
alter policy community_download on storage.objects using (
 bucket_id='community' and (owner_id=auth.uid()::text or exists(
  select 1 from public.submissions s where s.file_path=name and s.visibility='public' and (s.moderation_status='approved' or private.is_moderator())
 ))
);
-- A policy querying its own objects table causes infinite RLS recursion.
-- Quota enforcement belongs in the serialized, security-definer trigger below.
alter policy community_upload on storage.objects with check (
 bucket_id='community' and (storage.foldername(name))[1]=auth.uid()::text
 and owner_id=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/resource$'
 and exists(select 1 from public.profiles where id=auth.uid())
);
-- Serialize quota checks so parallel uploads cannot exceed either limit.
create or replace function private.guard_storage_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare used_bytes bigint; objects bigint;
begin
 if new.bucket_id<>'community' then return new; end if;
 if auth.uid() is null then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(auth.uid()::text));
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0),count(*) into used_bytes,objects from storage.objects where bucket_id='community' and owner_id=auth.uid()::text and id<>new.id;
 if objects>=25 or used_bytes+coalesce((new.metadata->>'size')::bigint,0)>104857600 then raise exception 'Your storage is full. Remove a file from Your space before uploading.'; end if;
 return new;
end; $$;
revoke all on function private.guard_storage_quota() from public;
create trigger guard_storage_quota before insert or update of metadata on storage.objects for each row execute function private.guard_storage_quota();
create or replace function public.storage_usage() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('bytes',coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0),'files',count(*),'limit_bytes',104857600)
 from storage.objects where bucket_id='community' and owner_id=auth.uid()::text;
$$;
revoke all on function public.storage_usage() from public;
grant execute on function public.storage_usage() to authenticated;
commit;
