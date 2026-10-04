import test from 'node:test';
import assert from 'node:assert/strict';
import {database,as,alice,bob} from '../test-support/database.js';

test('unverified and email-less authenticated accounts cannot create profiles or upload',async()=>{
 const pg=await database();
 try {
  await pg.exec(`update auth.users set email_confirmed_at=null where id='${bob}';`);
  await as(pg,'authenticated',bob);
  await assert.rejects(pg.query('insert into public.profiles(id,username,display_name) values($1,$2,$3)',[bob,'bob','Bob']),/row-level security/);
  await as(pg,'postgres');
  await pg.exec(`insert into public.profiles(id,username,display_name) values('${bob}','bob','Bob');`);
  await as(pg,'authenticated',bob);
  assert.equal((await pg.query('update public.profiles set bio=$1 returning id',['Edited bio'])).rows.length,0);
  await assert.rejects(pg.query('insert into public.submissions(title,summary,category,website_url,license) values($1,$2,$3,$4,$5)',['Blocked upload','This account has not verified its email.','Other','https://example.com','All rights reserved']),/row-level security/);
  await assert.rejects(pg.query('insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)',['community',`${bob}/20000000-0000-0000-0000-000000000001/resource`,bob,{size:1024,mimetype:'application/octet-stream'}]),/row-level security/);
  await as(pg,'postgres');
  await pg.exec(`update auth.users set email_confirmed_at=now(),email=null where id='${bob}';`);
  await as(pg,'authenticated',bob);
  assert.equal((await pg.query('select private.verified_account() as verified')).rows[0].verified,false);
  await assert.rejects(pg.query('select * from private.submission_events'),/permission denied/);
 } finally {await pg.close();}
});

test('deleting submissions cannot reset the five-per-day allowance',async()=>{
 const pg=await database();
 try {
  await pg.exec(`insert into public.profiles(id,username,display_name) values('${alice}','alice','Alice');`);
  await as(pg,'authenticated',alice);
  for(let i=0;i<5;i++){
   const row=await pg.query('insert into public.submissions(title,summary,category,website_url,license) values($1,$2,$3,$4,$5) returning id',['A test resource','A summary long enough for this resource.','Other','https://example.com','All rights reserved']);
   await pg.query('delete from public.submissions where id=$1',[row.rows[0].id]);
  }
  await assert.rejects(pg.query('insert into public.submissions(title,summary,category,website_url,license) values($1,$2,$3,$4,$5)',['Sixth attempt','A summary long enough for this resource.','Other','https://example.com','All rights reserved']),/five resources per day/);
  await as(pg,'postgres');
  assert.equal((await pg.query('select count(*)::int as n from private.submission_events')).rows[0].n,5);
  await pg.exec("update private.submission_events set created_at=now()-interval '25 hours';");
  await as(pg,'authenticated',alice);
  await pg.query('insert into public.submissions(title,summary,category,website_url,license) values($1,$2,$3,$4,$5)',['Next day upload','A summary long enough for this resource.','Other','https://example.com','All rights reserved']);
 } finally {await pg.close();}
});

test('storage quota survives provider metadata completion without a JWT and rejects unsafe metadata',async()=>{
 const pg=await database();
 try {
  assert.deepEqual((await pg.query("select allowed_mime_types from storage.buckets where id='community'")).rows[0].allowed_mime_types,['application/octet-stream']);
  const insert=(id,metadata)=>pg.query('insert into storage.objects(id,bucket_id,name,owner_id,metadata) values($1,$2,$3,$4,$5)',[id,'community',`${alice}/${id}/resource`,alice,metadata]);
  const first='20000000-0000-0000-0000-000000000001';
  for(const size of [-1,0,20971521,null,'unknown',1.5]) await assert.rejects(insert(first,{size,mimetype:'application/octet-stream'}),/file size|20 MB/);
  await assert.rejects(insert(first,{size:1024,mimetype:'text/html'}),/binary attachments/);
  for(let i=1;i<=5;i++) await insert(`20000000-0000-0000-0000-${String(i).padStart(12,'0')}`,{size:20971520,mimetype:'application/octet-stream'});
  await assert.rejects(insert('20000000-0000-0000-0000-000000000006',{size:1,mimetype:'application/octet-stream'}),/storage is full/);
  await pg.exec('delete from storage.objects');
  // Placeholder metadata is allowed; completion still uses the persisted owner.
  await insert(first,null);
  for(let i=2;i<=6;i++) await insert(`20000000-0000-0000-0000-${String(i).padStart(12,'0')}`,{size:20971520,mimetype:'application/octet-stream'});
  await assert.rejects(pg.query('update storage.objects set metadata=$1 where id=$2',[{size:1024,mimetype:'application/octet-stream'},first]),/storage is full/);
  await pg.exec('delete from storage.objects');
  for(let i=1;i<=25;i++) await insert(`20000000-0000-0000-0000-${String(i).padStart(12,'0')}`,{size:1,mimetype:'application/octet-stream'});
  await assert.rejects(insert('20000000-0000-0000-0000-000000000026',{size:1,mimetype:'application/octet-stream'}),/storage is full/);
 } finally {await pg.close();}
});
