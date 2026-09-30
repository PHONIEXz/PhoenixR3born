import test from 'node:test';
import assert from 'node:assert/strict';
import {safeUrl, safeAssetUrl, normalizeItems, downloadUrl, destinations} from '../src/config.js';

test('destination links reject executable schemes and embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'https://owner:secret@example.com', 'http://example.com', null, {}]) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl('https://github.com/PHONIEXz/Project-Phoenix'), 'https://github.com/PHONIEXz/Project-Phoenix');
});
test('downloads stay on this project asset origin and preserve query encoding', () => {
  for (const url of ['https://cdn.sanity.io.evil.example/files/c5jww98i/production/a.zip', 'https://cdn.sanity.io/files/another/production/a.zip', 'https://example.com/file.html']) assert.equal(safeAssetUrl(url), null);
  const url = 'https://cdn.sanity.io/files/c5jww98i/production/a.zip?existing=1';
  const download = new URL(downloadUrl({url,name:'lesson & code.zip'}));
  assert.equal(download.searchParams.get('dl'), 'lesson & code.zip');
  assert.equal(download.searchParams.get('existing'), '1');
});
test('malformed published data cannot break rendering or inject executable destinations', () => {
  const items = normalizeItems([null, {slug:'../studio'}, {slug:'signal', title:{bad:true}, files:[null, {url:'javascript:alert(1)'}], websiteUrl:'javascript:alert(1)', description:{bad:true}}]);
  assert.equal(items.length, 1); assert.equal(items[0].title, 'Untitled'); assert.equal(items[0].description, ''); assert.deepEqual(items[0].files, []); assert.equal(items[0].websiteUrl, null);
  assert.throws(() => normalizeItems({}), /Unexpected/);
});
test('web projects offer a website and downloadable projects offer setup instructions', () => {
  assert.equal(destinations({websiteUrl:'https://example.com',githubUrl:'https://github.com/owner/repo'})[0].label, 'Visit website');
  assert.equal(destinations({githubUrl:'https://github.com/owner/repo'})[0].label, 'Read setup instructions');
  assert.equal(destinations({websiteUrl:'https://example.com',link:'https://example.com'}).length, 1);
});
import {checkFile, submissionInput} from '../src/community.js';

test('community uploads enforce supported types and a hard size limit', () => {
  assert.equal(checkFile({name:'chapter.pdf',size:1024}), 'application/pdf');
  assert.throws(() => checkFile({name:'payload.exe',size:1024}), /supported/);
  assert.throws(() => checkFile({name:'large.zip',size:20 * 1024 * 1024 + 1}), /20 MB/);
});

test('community submissions reject unsafe links and require a useful destination', () => {
  const base = {title:'A useful lesson',summary:'A clear explanation for someone learning this topic.',description:'',category:'Learning',project_status:'in-progress',website_url:'',github_url:'',license:'CC-BY-4.0'};
  assert.throws(() => submissionInput({...base,website_url:'javascript:alert(1)'}, '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', null), /HTTPS/);
  assert.throws(() => submissionInput(base, '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', null), /website, GitHub repository, or file/);
  const value = submissionInput({...base,github_url:'https://github.com/owner/repo'}, '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', null);
  assert.equal(value.moderation_status, undefined);
  assert.equal(value.github_url, 'https://github.com/owner/repo');
});
