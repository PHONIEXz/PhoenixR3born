export const projectId = 'c5jww98i';
export const dataset = 'production';
export const apiVersion = '2026-09-30';
export function safeUrl(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
export async function loadItems() {
 const query = '*[_type == "resource" && !(_id in path("drafts.**")) && defined(slug.current)] | order(coalesce(featured, false) desc, publishedAt desc, _createdAt desc){_id,title,"slug":slug.current,summary,description,category,featured,link,label,publishedAt,"cover":cover.asset->url,"files":files[]{_key,label,"url":asset->url,"name":asset->originalFilename,"size":asset->size,"mime":asset->mimeType}}';
 const response = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}&perspective=published`, {signal:AbortSignal.timeout(15000)});
 if(!response.ok) throw new Error('The collection could not be loaded.');
 const data = await response.json(); if(!Array.isArray(data.result)) throw new Error('Unexpected collection response.'); return data.result;
}
