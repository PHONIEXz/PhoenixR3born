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
