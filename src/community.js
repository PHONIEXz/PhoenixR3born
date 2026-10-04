import {createClient} from '@supabase/supabase-js';
import {safeUrl} from './config.js';
const env = import.meta.env || {};
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
export const db = url && key ? createClient(url, key, {auth: {flowType: 'pkce'}}) : null;
export const licenses = ['CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0','MIT','Apache-2.0','All rights reserved','See source license'];
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export function checkFile(file) {
 if(!file || typeof file.name!=='string' || !file.name.trim()) throw new Error('Choose a file to upload.');
 if(file.size>MAX_UPLOAD_BYTES || file.size<1) throw new Error('Files must be between 1 byte and 20 MB. Larger resources can use an external link.');
 // Never serve user-controlled HTML, SVG, scripts, or other active content inline.
 return 'application/octet-stream';
}
export function submissionInput(form, userId, id, file) {
 const title=form.title.trim(), summary=form.summary.trim();
 if(title.length<3 || title.length>100 || summary.length<10 || summary.length>280) throw new Error('Use a title of 3 to 100 characters and a summary of 10 to 280 characters.');
 const website=safeUrl(form.website_url), github=safeUrl(form.github_url);
 if(form.website_url && !website) throw new Error('Website links must use HTTPS and contain no credentials.');
 if(form.github_url && (!github || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(github))) throw new Error('Enter a GitHub repository link, such as https://github.com/owner/project.');
 if(!website && !github && !file) throw new Error('Add a website, GitHub repository, or file.');
 if(!licenses.includes(form.license)) throw new Error('Choose a sharing license.');
 return {id,author_id:userId,title,summary,description:form.description,category:form.category,project_status:form.project_status,website_url:website,github_url:github,license:form.license,visibility:form.visibility==='public'?'public':'private',file_path:file?`${userId}/${id}/resource`:null,file_name:file?file.name.slice(0,200):null};
}
export async function result(request) { const {data,error}=await request; if(error) throw new Error(error.message); return data; }
export async function insertResource(input, client=db) {
 const {error}=await client.from('submissions').insert(input);
 if(!error) return;
 if(input.file_path) {
  // A lost response does not prove the INSERT failed. Never delete a file
  // belonging to a listing that may already have committed.
  const confirmed=await client.from('submissions').select('id').eq('id',input.id).maybeSingle();
  if(!confirmed.error && confirmed.data) return;
  // Only definitive constraint/permission/trigger failures are safe to clean up.
  const rejected=(/^(23|42)/.test(error.code||'') && error.code!=='23505') || error.code==='P0001';
  if(rejected && !confirmed.error && !confirmed.data) {
   const removed=await client.storage.from('community').remove([input.file_path]);
   if(removed.error) throw new Error('The resource was not saved, and its uploaded file could not be removed. Contact the site owner to recover the storage space.');
  } else {
   throw new Error('The save could not be confirmed. Your file was kept to avoid losing it. Check Your space before trying again.');
  }
 }
 throw new Error(error.message);
}
export async function readResources(filters={}) {
 if(!db) throw new Error('Community accounts are being configured. Please check back soon.');
 let q=db.from('submissions').select('*,profiles(username,display_name)').order('created_at',{ascending:false}).limit(100);
 if(filters.author) q=q.eq('author_id',filters.author);
 if(filters.status) q=q.eq('moderation_status',filters.status);
 if(filters.id) q=q.eq('id',filters.id);
 if(filters.visibility) q=q.eq('visibility',filters.visibility);
 return result(q);
}
export async function fileLink(resource) {
 const data=await result(db.storage.from('community').createSignedUrl(resource.file_path,60,{download:resource.file_name || 'resource'}));
 return data.signedUrl;
}
export async function deleteResource(resource,userId) {
 if(!resource || resource.author_id!==userId) throw new Error('Only the uploader can remove this resource.');
 // Storage and Postgres are separate services. Remove the object first, then its
 // listing. A failed listing delete can be retried without restoring the file.
 if(resource.file_path) await result(db.storage.from('community').remove([resource.file_path]));
 const removed=await result(db.from('submissions').delete().eq('id',resource.id).eq('author_id',userId).select('id'));
 if(removed.length!==1) throw new Error('The resource was not removed. Please try again.');
}

export async function changeVisibility(resource, visibility, userId) {
 if(resource.author_id!==userId || !['private','public'].includes(visibility)) throw new Error('Only the uploader can change sharing.');
 const changed=await result(db.from('submissions').update({visibility}).eq('id',resource.id).eq('author_id',userId).select('*,profiles(username,display_name)'));
 if(changed.length!==1) throw new Error('Sharing was not changed. Please try again.');
 return changed[0];
}
export async function storageUsage() { return result(db.rpc('storage_usage')); }

export async function loadSharedCollection() {
 if(!db) return [];
 const profile=await result(db.from('profiles').select('id').eq('username','phoenixr3born').maybeSingle());
 if(!profile) return [];
 const rows=await readResources({author:profile.id,status:'approved',visibility:'public'});
 return rows.map(r=>({_id:r.id,slug:r.id,title:r.title,summary:r.summary,description:r.description,category:r.category,status:r.project_status,featured:false,websiteUrl:safeUrl(r.website_url),githubUrl:safeUrl(r.github_url),link:null,label:'',cover:null,files:[],resourceId:r.id}));
}
