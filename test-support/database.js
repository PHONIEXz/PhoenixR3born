import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const alice='10000000-0000-0000-0000-000000000001';
export const bob='10000000-0000-0000-0000-000000000002';
export const moderator='10000000-0000-0000-0000-000000000003';
export async function database(){
 const pg=new PGlite();
 try {
 await pg.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema storage;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage to anon,authenticated;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to authenticated;
 grant select on storage.objects to anon;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 insert into auth.users(id) values('${alice}'),('${bob}'),('${moderator}');
 update auth.users set email=id::text||'@example.com',email_confirmed_at=now();
 update auth.users set email='alice@example.com' where id='${alice}';
 `);
 for(const name of ['202609300001_community.sql','202609300002_community_hardening.sql','202610010001_moderator_bootstrap.sql','202610010002_storage_auth.sql','202610040001_private_spaces.sql','202610040002_security_review.sql']) {
  await pg.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
 }
 return pg;
 } catch(e){await pg.close();throw e;}
}
export async function as(pg,role,id=''){await pg.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`);}
