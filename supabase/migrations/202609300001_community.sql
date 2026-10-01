begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table private.moderators (user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.moderators enable row level security;
create function private.is_moderator() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from private.moderators where user_id = auth.uid()); $$;
revoke all on function private.is_moderator() from public;
grant execute on function private.is_moderator() to anon, authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check(username ~ '^[a-z0-9][a-z0-9_]{2,29}$'),
 display_name text not null check(length(display_name) between 1 and 60),
 bio text not null default '' check(length(bio)<=500),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert(id,username,display_name,bio), update(username,display_name,bio) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using(true);
create policy profiles_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create table public.submissions (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
 title text not null check(length(title) between 3 and 100),
 summary text not null check(length(summary) between 10 and 280),
 description text not null default '' check(length(description)<=20000),
 category text not null check(category in ('Projects','Tools','Learning','Downloads','Recommendations','Other')),
 project_status text not null default 'in-progress' check(project_status in ('completed','in-progress')),
 website_url text check(website_url is null or (length(website_url)<=2048 and website_url ~ '^https://[^/@[:space:]]+(\/|$)')),
 github_url text check(github_url is null or github_url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$'),
 file_path text unique,
 file_name text check(length(file_name)<=200),
 license text not null check(license in ('CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0','MIT','Apache-2.0','All rights reserved','See source license')),
 moderation_status text not null default 'pending' check(moderation_status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 check(website_url is not null or github_url is not null or file_path is not null),
 check(file_path is null or file_path = author_id::text || '/' || id::text || '/resource')
);
create index submissions_author on public.submissions(author_id);
create index submissions_review on public.submissions(moderation_status,created_at desc);
alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
grant select on public.submissions to anon, authenticated;
grant insert(id,author_id,title,summary,description,category,project_status,website_url,github_url,file_path,file_name,license) on public.submissions to authenticated;
grant update(moderation_status) on public.submissions to authenticated;
create policy submissions_read on public.submissions for select using(moderation_status='approved' or author_id=auth.uid() or private.is_moderator());
create policy submissions_insert on public.submissions for insert to authenticated with check(author_id=auth.uid() and moderation_status='pending');
create policy submissions_moderate on public.submissions for update to authenticated using(private.is_moderator()) with check(private.is_moderator());
create function private.limit_submissions() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.author_id::text));
 if (select count(*) from public.submissions where author_id=new.author_id and created_at>now()-interval '24 hours')>=5 then raise exception 'You can submit up to five resources per day.'; end if;
 if new.file_path is not null and not exists(select 1 from storage.objects where bucket_id='community' and name=new.file_path and owner_id=new.author_id::text) then raise exception 'Upload the file before submitting.'; end if;
 return new;
end; $$;
revoke all on function private.limit_submissions() from public;
create trigger limit_submissions before insert on public.submissions for each row execute function private.limit_submissions();
create function public.moderator_status() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_moderator(); $$;
revoke all on function public.moderator_status() from public;
grant execute on function public.moderator_status() to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community','community',false,20971520,array['application/pdf','text/plain','text/markdown','text/csv','application/zip','application/x-zip-compressed','image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','video/mp4','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy community_upload on storage.objects for insert to authenticated with check(bucket_id='community' and (storage.foldername(name))[1]=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/resource$' and exists(select 1 from public.profiles where id=auth.uid()) and (select count(*) from storage.objects where bucket_id='community' and owner_id=auth.uid()::text)<25);
create policy community_download on storage.objects for select using(bucket_id='community' and (owner_id=auth.uid()::text or private.is_moderator() or exists(select 1 from public.submissions where file_path=name and moderation_status='approved')));
-- Unsubmitted files can be removed by their owner. Published/pending content is immutable.
create policy community_cleanup on storage.objects for delete to authenticated using(bucket_id='community' and owner_id=auth.uid()::text and not exists(select 1 from public.submissions where file_path=name));
commit;
