import {createClient} from '@supabase/supabase-js';
import {safeUrl} from './config.js';
const env = import.meta.env || {};
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
export const db = url && key ? createClient(url, key, {auth: {flowType: 'pkce'}}) : null;
export const licenses = ['CC-BY-4.0','CC-BY-SA-4.0','CC0-1.0','MIT','Apache-2.0','All rights reserved','See source license'];
export const types = {'pdf':'application/pdf','txt':'text/plain','md':'text/markdown','csv':'text/csv','zip':'application/zip','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','mp3':'audio/mpeg','wav':'audio/wav','mp4':'video/mp4','docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
export function checkFile(file) {
 if (!file || !types[file.name.split('.').pop().toLowerCase()]) throw new Error('Choose a supported document, image, audio, video, or ZIP file.');
 if(file.size>20*1024*1024 || file.size<1) throw new Error('Files must be between 1 byte and 20 MB. Larger resources can use an external link.');
 return types[file.name.split('.').pop().toLowerCase()];
}
export function submissionInput(form, userId, id, file) {
 const title=form.title.trim(), summary=form.summary.trim();
 if(title.length<3 || title.length>100 || summary.length<10 || summary.length>280) throw new Error('Use a title of 3 to 100 characters and a summary of 10 to 280 characters.');
 const website=safeUrl(form.website_url), github=safeUrl(form.github_url);
 if(form.website_url && !website) throw new Error('Website links must use HTTPS and contain no credentials.');
 if(form.github_url && (!github || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(github))) throw new Error('Enter a GitHub repository link, such as https://github.com/owner/project.');
 if(!website && !github && !file) throw new Error('Add a website, GitHub repository, or file.');
 if(!licenses.includes(form.license)) throw new Error('Choose a sharing license.');
 return {id,author_id:userId,title,summary,description:form.description,category:form.category,project_status:form.project_status,website_url:website,github_url:github,license:form.license,file_path:file?`${userId}/${id}/resource`:null,file_name:file?file.name.slice(0,200):null};
}
export async function result(request) { const {data,error}=await request; if(error) throw new Error(error.message); return data; }
export async function readResources(filters={}) {
 if(!db) throw new Error('Community accounts are being configured. Please check back soon.');
 let q=db.from('submissions').select('*,profiles(username,display_name)').order('created_at',{ascending:false}).limit(100);
 if(filters.author) q=q.eq('author_id',filters.author);
 if(filters.status) q=q.eq('moderation_status',filters.status);
 if(filters.id) q=q.eq('id',filters.id);
 return result(q);
}
export async function fileLink(resource) {
 const data=await result(db.storage.from('community').createSignedUrl(resource.file_path,60,{download:resource.file_name || 'resource'}));
 return data.signedUrl;
}
