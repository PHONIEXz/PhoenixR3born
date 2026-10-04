import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';

const alice='10000000-0000-0000-0000-000000000001';
const bob='10000000-0000-0000-0000-000000000002';
const moderator='10000000-0000-0000-0000-000000000003';
const resource='20000000-0000-0000-0000-000000000001';
const object=`${alice}/${resource}/resource`;

test('database enforces private access, review transitions, download access and storage quotas',async()=>{
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
 update auth.users set email='alice@example.com',email_confirmed_at=now() where id='${alice}';
 `);
 for(const name of ['202609300001_community.sql','202609300002_community_hardening.sql','202610010001_moderator_bootstrap.sql','202610010002_storage_auth.sql','202610040001_private_spaces.sql']) {
  await pg.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
 }
 await pg.exec(`insert into public.profiles(id,username,display_name) values('${alice}','alice','Alice'),('${bob}','bob','Bob'),('${moderator}','mod','Moderator'); insert into private.moderators values('${moderator}');`);
 async function as(role,id='') {await pg.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`);}
 async function count(table){return Number((await pg.query(`select count(*) as n from ${table}`)).rows[0].n);}
 await as('authenticated',alice);
 await pg.query('insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)',['community',object,alice,{size:1024}]);
 await pg.query('insert into public.submissions(id,author_id,title,summary,category,license,file_path,file_name) values($1,$2,$3,$4,$5,$6,$7,$8)',[resource,alice,'Private file','A resource kept in a private account.','Downloads','All rights reserved',object,'private.txt']);
 assert.equal(await count('public.submissions'),1);
 assert.equal(await count('storage.objects'),1);
 await as('anon');assert.equal(await count('public.submissions'),0);assert.equal(await count('storage.objects'),0);
 await as('authenticated',bob);assert.equal(await count('public.submissions'),0);assert.equal(await count('storage.objects'),0);
 assert.equal((await pg.query(`update public.submissions set visibility='public' where id='${resource}' returning id`)).rows.length,0);
 await as('authenticated',moderator);assert.equal(await count('public.submissions'),0);assert.equal(await count('storage.objects'),0);
 await as('authenticated',alice);
 await assert.rejects(pg.query(`update public.submissions set moderation_status='approved' where id='${resource}'`),/Only moderators/);
 await pg.query(`update public.submissions set visibility='public' where id='${resource}'`);
 await as('anon');assert.equal(await count('public.submissions'),0);
 await as('authenticated',moderator);assert.equal(await count('public.submissions'),1);assert.equal(await count('storage.objects'),1);
 await pg.query(`update public.submissions set moderation_status='approved' where id='${resource}'`);
 await as('anon');assert.equal(await count('public.submissions'),1);assert.equal(await count('storage.objects'),1);
 await as('authenticated',alice);await pg.query(`update public.submissions set visibility='private' where id='${resource}'`);
 assert.equal((await pg.query(`select moderation_status from public.submissions where id='${resource}'`)).rows[0].moderation_status,'pending');
 await as('anon');assert.equal(await count('public.submissions'),0);assert.equal(await count('storage.objects'),0);
 await as('authenticated',moderator);assert.equal(await count('storage.objects'),0);
 await as('authenticated',alice);
 // Client updates remain immutable; provider metadata completion also checks quota.
 assert.equal((await pg.query('update storage.objects set metadata=$1 where name=$2 returning id',[{size:2048},object])).rows.length,0);
 await pg.exec('reset role');
 await assert.rejects(pg.query('update storage.objects set metadata=$1 where name=$2',[{size:104857601},object]),/storage is full/);
 await pg.exec('set role authenticated');
 for(let i=2;i<=5;i++) await pg.query('insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)',['community',`${alice}/20000000-0000-0000-0000-${String(i).padStart(12,'0')}/resource`,alice,{size:20971520}]);
 await assert.rejects(pg.query('insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)',['community',`${alice}/20000000-0000-0000-0000-000000000006/resource`,alice,{size:20971520}]),/storage is full/);
 const usage=(await pg.query('select public.storage_usage() as usage')).rows[0].usage;
 assert.equal(usage.bytes,83887104);assert.equal(usage.files,5);assert.equal(usage.limit_bytes,104857600);
 await pg.query('delete from storage.objects where name=$1',[object]);
 await pg.query(`delete from public.submissions where id='${resource}'`);
 assert.equal(await count('public.submissions'),0);
 // The transfer script assigns the verified account and escapes source text.
 await pg.exec("reset role; select set_config('request.jwt.claim.sub','',false)");
 const transferDir=await mkdtemp(join(tmpdir(),'p3-import-'));
 try {
  const source=join(transferDir,'source.json'),output=join(transferDir,'import.sql');
  await writeFile(source,JSON.stringify([{_id:'legacy',slug:'legacy-project',title:'A legacy project',summary:'A project ready to move to a private account.',description:"O'Reilly $owner_import$",category:'Projects',status:'in-progress',githubUrl:'https://github.com/owner/project'}]));
  execFileSync(process.execPath,[new URL('../scripts/prepare-owner-import.mjs',import.meta.url).pathname,source,output],{env:{...process.env,P3_OWNER_EMAIL:'alice@example.com'}});
  const sql=await readFile(output,'utf8');await pg.exec(sql);await pg.exec(sql);
  const imported=(await pg.query("select author_id,visibility,description from public.submissions where title='A legacy project'")).rows;
  assert.equal(imported.length,1);assert.equal(imported[0].author_id,alice);assert.equal(imported[0].visibility,'private');assert.equal(imported[0].description,"O'Reilly $owner_import$");
 } finally {await rm(transferDir,{recursive:true,force:true});}
 } finally {await pg.close();}
});
