if (!process.argv.includes('--live')) throw Error('Requiere --live para crear fixtures temporales.');
const fs = require('node:fs'), assert = require('node:assert/strict');
const { createFixtures } = require('./flow-fixtures.cjs');
const f = createFixtures(), base = process.env.FLOW_BASE_URL || 'http://localhost:3001';
async function main() { try {
  const teacher = await f.account('profesor');
  const cookie = [...teacher.cookies.values()].map(c => `${c.name}=${c.value}`).join('; ');
  await fetch(base + '/profesor/perfil', { headers: { cookie } });
  const build = process.env.FLOW_BUILD_DIR || (base.endsWith(':3002') ? '.next/dev' : '.next');
  const manifest = JSON.parse(fs.readFileSync(`${build}/server/server-reference-manifest.json`, 'utf8'));
  const action = Object.entries(manifest.node).find(([, v]) => v.exportedName === 'subirMiAvatar');
  assert.ok(action, 'Avatar action missing');
  const bytes = Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAXkAAAAASUVORK5CYII=', 'base64'), Buffer.alloc(1200000)]);
  let value = new File([bytes], 'fixture.png', { type: 'image/png' });
  if (!process.argv.includes('--baseline')) {
    const prepared = await fetch(base + '/api/uploads/prepare', { method: 'POST', headers: { cookie, origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value.name, size: value.size, type: value.type }) });
    assert.equal(prepared.status, 200, 'Prepare upload');
    const upload = await prepared.json();
    const uploaded = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: bytes });
    assert.ok(uploaded.ok, 'Direct storage upload failed');
    value = upload.ticket;
  }
  // Streaming decoding resolves the root after its nested FormData fields arrive.
  const data = new FormData(); data.set('_1_avatar', value); data.set('0', '["$K1"]');
  const response = await fetch(base + '/profesor/perfil', { method: 'POST', headers: { cookie, origin: base, 'Next-Action': action[0], Accept: 'text/x-component' }, body: data });
  console.log(`Avatar multipart ${process.argv.includes('--baseline') ? 'baseline' : 'direct upload'}: HTTP ${response.status}`);
  // Next's RSC response may be 500 while the logged parser error has statusCode 413.
  if (process.argv.includes('--baseline')) assert.ok([413, 500].includes(response.status));
  else {
    const body = await response.text();
    assert.equal(response.status, 200);
    const error = body.match(/"error":"([^"]{0,180})"/);
    assert.ok(body.includes('"ok":true'), `Avatar action did not report success${error ? ': ' + error[1] : ''}`);
    const profile = await f.admin.from('perfiles').select('avatar_url').eq('id', teacher.id).single();
    assert.ok(profile.data?.avatar_url, 'Avatar was not persisted');
    console.log('PASS >1 MB direct upload → guarded server action → profile saved.');
  }
  const files = await f.admin.storage.from('avatares').list(teacher.id);
  if (files.data?.length) await f.admin.storage.from('avatares').remove(files.data.map(file => `${teacher.id}/${file.name}`));
} finally { await f.cleanup(); } }
main().catch(error => { console.error(error.message); process.exitCode = 1; });
