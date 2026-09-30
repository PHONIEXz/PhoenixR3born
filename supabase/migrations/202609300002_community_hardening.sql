begin;
create or replace function private.limit_submissions() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.author_id::text));
 if (select count(*) from public.submissions where author_id=new.author_id and created_at>now()-interval '24 hours')>=5 then raise exception 'You can submit up to five resources per day.'; end if;
 if new.file_path is not null and not exists(select 1 from storage.objects where bucket_id='community' and name=new.file_path and owner_id=new.author_id::text) then raise exception 'Upload the file before submitting.'; end if;
 return new;
end; $$;
revoke all on function private.limit_submissions() from public;
create function private.claim_first_moderator() returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(913004);
 if exists(select 1 from private.moderators) then return false; end if;
 insert into private.moderators(user_id) values(auth.uid());
 return true;
end; $$;
revoke all on function private.claim_first_moderator() from public;
grant execute on function private.claim_first_moderator() to authenticated;
commit;
