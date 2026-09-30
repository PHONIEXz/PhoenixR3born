export const projectId = 'c5jww98i';
export const dataset = 'production';
export const apiVersion = '2026-09-30';

// Destinations can navigate visitors, but never execute code or carry credentials.
export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function safeAssetUrl(value, kind = 'files') {
  const clean = safeUrl(value);
  if (!clean) return null;
  const url = new URL(clean);
  return url.hostname === 'cdn.sanity.io' && url.pathname.startsWith(`/${kind}/${projectId}/${dataset}/`) ? clean : null;
}
export function downloadUrl(file) {
  const clean = safeAssetUrl(file.url);
  if (!clean) return null;
  const url = new URL(clean);
  url.searchParams.set('dl', file.name || 'download');
  return url.href;
}
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
export function normalizeItems(items) {
  if (!Array.isArray(items)) throw new Error('Unexpected collection response.');
  return items.filter(x => x && typeof x === 'object' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug || '')).slice(0, 200).map(x => ({
    _id: text(x._id, 200), title: text(x.title, 100) || 'Untitled', slug: x.slug,
    summary: text(x.summary, 280), description: text(x.description, 20000),
    category: text(x.category, 50) || 'Other', featured: x.featured === true,
    status: x.status === 'completed' ? 'completed' : 'in-progress',
    websiteUrl: safeUrl(x.websiteUrl), githubUrl: safeUrl(x.githubUrl),
    link: safeUrl(x.link), label: text(x.label, 60),
    cover: safeAssetUrl(x.cover, 'images'),
    files: Array.isArray(x.files) ? x.files.filter(f => f && safeAssetUrl(f.url)).slice(0, 20).map(f => ({
      _key: text(f._key, 100), url: safeAssetUrl(f.url), name: text(f.name, 200),
      label: text(f.label, 100), size: typeof f.size === 'number' && f.size > 0 ? f.size : null,
    })) : [],
  }));
}
export function destinations(item) {
  const result = [];
  const website = safeUrl(item.websiteUrl), github = safeUrl(item.githubUrl), legacy = safeUrl(item.link);
  if (website) result.push({url: website, label: 'Visit website', kind: 'website'});
  if (github) result.push({url: github, label: website ? 'View GitHub' : 'Read setup instructions', kind: 'github'});
  if (legacy && !result.some(x => x.url === legacy)) result.push({url: legacy, label: item.label || 'Check it out', kind: 'link'});
  return result;
}
export async function loadItems() {
  const query = '*[_type == "resource" && !(_id in path("drafts.**")) && defined(slug.current)] | order(coalesce(featured, false) desc, publishedAt desc, _createdAt desc)[0...200]{_id,title,"slug":slug.current,summary,description,category,featured,status,websiteUrl,githubUrl,link,label,"cover":cover.asset->url,"files":files[0...20]{_key,label,"url":asset->url,"name":asset->originalFilename,"size":asset->size}}';
  const response = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}&perspective=published`, {signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('The collection could not be loaded.');
  return normalizeItems((await response.json()).result);
}
