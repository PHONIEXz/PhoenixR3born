import test from 'node:test';
import assert from 'node:assert/strict';
import {insertResource} from '../src/community.js';

function failingClient(error,confirmed,removeError=null){
 const removed=[];
 const client={
  from:()=>({insert:async()=>({error}),select:()=>({eq:()=>({maybeSingle:async()=>confirmed})})}),
  storage:{from:()=>({remove:async paths=>{removed.push(...paths);return {error:removeError};}})}
 };
 return {client,removed};
}
const input={id:'resource-id',file_path:'owner/resource-id/resource'};
test('a committed listing survives a lost INSERT response',async()=>{
 const {client,removed}=failingClient({code:'',message:'Failed to fetch'},{data:{id:input.id},error:null});
 await insertResource(input,client);
 assert.deepEqual(removed,[]);
});
test('an unknown save outcome preserves the uploaded bytes',async()=>{
 for(const confirmed of [{data:null,error:null},{data:null,error:{message:'Offline'}}]){
  const {client,removed}=failingClient({code:'',message:'Failed to fetch'},confirmed);
  await assert.rejects(insertResource(input,client),/file was kept/);
  assert.deepEqual(removed,[]);
 }
});
test('definitively rejected submissions clean up the upload and report cleanup failures',async()=>{
 const rejected={code:'23514',message:'Invalid resource'};
 const {client,removed}=failingClient(rejected,{data:null,error:null});
 await assert.rejects(insertResource(input,client),/Invalid resource/);
 assert.deepEqual(removed,[input.file_path]);
 const failed=failingClient(rejected,{data:null,error:null},{message:'Offline'});
 await assert.rejects(insertResource(input,failed.client),/could not be removed/);
});
test('duplicate inserts or unavailable confirmation cannot delete an existing file',async()=>{
 for(const [error,confirmed] of [
  [{code:'23505',message:'Duplicate id'},{data:null,error:null}],
  [{code:'23514',message:'Constraint failure'},{data:null,error:{message:'Offline'}}]
 ]){
  const {client,removed}=failingClient(error,confirmed);
  await assert.rejects(insertResource(input,client),/file was kept/);
  assert.deepEqual(removed,[]);
 }
});
