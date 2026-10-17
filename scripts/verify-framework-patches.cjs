// Dependency audit feeds can lag behind maintainer advisories. Fail CI on known affected framework versions.
// https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r
// https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function atLeast(version, minimum) {
  if (!/^\d+\.\d+\.\d+$/.test(version || '')) return false;
  const actual = version.split('.').map(Number), baseline = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== baseline[i]) return actual[i] > baseline[i];
  }
  return true;
}
for (const bad of ['16.3.8','16.4.0','16.4.1-canary.1','invalid']) assert.equal(atLeast(bad,'16.4.1'), false);
for (const good of ['16.4.1','16.4.2']) assert.equal(atLeast(good,'16.4.1'), true);
const manifest = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const next = lock.packages?.['node_modules/next']?.version;
assert.ok(atLeast(next,'16.4.1'), 'Next.js must include the October 2026 Server Actions/cache fixes');
assert.equal(manifest.dependencies.next,next,'Pin the reviewed Next.js version exactly');
const sharp = Object.entries(lock.packages || {}).filter(([name]) => /(?:^|\/)node_modules\/sharp$/.test(name));
assert.ok(sharp.length, 'Image optimizer dependency must be recorded');
for (const [,pkg] of sharp) assert.ok(atLeast(pkg.version,'0.35.5'),'Image optimizer must include the SVG mitigation');
assert.equal(manifest.dependencies.react, manifest.dependencies['react-dom'],'React and ReactDOM must remain aligned');
assert.equal(atLeast('19.3.0','19.3.1'),false);
assert.ok(atLeast(manifest.dependencies.react,'19.3.1'),'Keep the reviewed React transport baseline');
for (const name of ['next','react','react-dom']) {
  assert.equal(require(path.join(root,'node_modules',name,'package.json')).version, lock.packages['node_modules/'+name].version,'Installed dependency differs from lock: '+name);
}
console.log('PASS framework patch guard: reviewed Next.js, aligned React and patched image optimizer.');
