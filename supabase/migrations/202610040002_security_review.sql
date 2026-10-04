-- Enforce account verification, durable rate limits and attachment uploads.
begin;

create function private.verified_account() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid()
  and email_confirmed_at is not null and nullif(email,'') is not null);
$$;
revoke all on function private.verified_account() from public;
grant execute on function private.verified_account() to authenticated;

-- Restrictive policies are ANDed with the existing ownership policies.
create policy profiles_verified_insert on public.profiles as restrictive
for insert to authenticated with check(private.verified_account());
create policy profiles_verified_update on public.profiles as restrictive
for update to authenticated using(private.verified_account()) with check(private.verified_account());
create policy submissions_verified_insert on public.submissions as restrictive
for insert to authenticated with check(private.verified_account());
create policy submissions_verified_update on public.submissions as restrictive
for update to authenticated using(private.verified_account()) with check(private.verified_account());
create policy community_verified_upload on storage.objects as restrictive
for insert to authenticated with check(bucket_id<>'community' or private.verified_account());

-- Deleting a resource must not refund the rolling daily submission allowance.
create table private.submission_events (
 resource_id uuid primary key,
 author_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table private.submission_events enable row level security;
revoke all on private.submission_events from public,anon,authenticated;
create index submission_events_author_time on private.submission_events(author_id,created_at);
insert into private.submission_events(resource_id,author_id,created_at)
select id,author_id,created_at from public.submissions;

create or replace function private.limit_submissions() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.author_id::text));
 delete from private.submission_events where author_id=new.author_id and created_at<now()-interval '30 days';
 if (select count(*) from private.submission_events where author_id=new.author_id
     and created_at>now()-interval '24 hours')>=5 then
  raise exception 'You can submit up to five resources per day.';
 end if;
 if new.file_path is not null and not exists(select 1 from storage.objects
    where bucket_id='community' and name=new.file_path and owner_id=new.author_id::text) then
  raise exception 'Upload the file before submitting.';
 end if;
 insert into private.submission_events(resource_id,author_id) values(new.id,new.author_id);
 return new;
end; $$;

-- All extensions remain supported, but the Storage API accepts binary MIME only.
update storage.buckets set allowed_mime_types=array['application/octet-stream']
where id='community';

-- Storage may complete metadata using a service session without a user JWT.
-- Count against the persisted owner, not the session completing the upload.
create or replace function private.guard_storage_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare used_bytes bigint; objects bigint; file_bytes bigint:=0;
begin
 if new.bucket_id<>'community' then return new; end if;
 if new.owner_id is null or new.owner_id !~ '^[0-9a-f-]{36}$' then
  raise exception 'A file must have an account owner.';
 end if;
 if new.metadata ? 'size' then
  if new.metadata->>'size' is null or new.metadata->>'size' !~ '^[0-9]{1,10}$' then
   raise exception 'Invalid file size.';
  end if;
  file_bytes:=(new.metadata->>'size')::bigint;
  if file_bytes<1 or file_bytes>20971520 then raise exception 'Files must be between 1 byte and 20 MB.'; end if;
 end if;
 if new.metadata ? 'mimetype' and new.metadata->>'mimetype' is distinct from 'application/octet-stream' then
  raise exception 'Upload files as binary attachments.';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.owner_id));
 select coalesce(sum(greatest(coalesce((metadata->>'size')::bigint,0),0)),0),count(*)
 into used_bytes,objects from storage.objects
 where bucket_id='community' and owner_id=new.owner_id and id<>new.id;
 if objects>=25 or used_bytes+file_bytes>104857600 then
  raise exception 'Your storage is full. Remove a file from Your space before uploading.';
 end if;
 return new;
end; $$;
commit;
