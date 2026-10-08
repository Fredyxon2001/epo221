const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

function load(file, mocks = {}, cache = new Map()) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exported = {};
  cache.set(absolute, exported);
  const requireModule = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith('.css')) return {};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
      const target = ['.ts', '.tsx'].map((ext) => base + ext).find((candidate) => fs.existsSync(candidate));
      return load(target, mocks, cache);
    }
    return require(name);
  };
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports: exported, require: requireModule, Date, URL, console });
  return exported;
}

(async () => {
  const mocks = { 'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children), __esModule: true } };
  // Both components must share the context instance, just as in the app bundle.
  const cache = new Map();
  const Provider = load('src/components/CookieConsentProvider.tsx', mocks, cache).CookieConsentProvider;
  const MapComponent = load('src/components/ConsentMap.tsx', mocks, cache).ConsentMap;
  const { CONSENT_COOKIE, CONSENT_MAX_AGE, parseConsent } = load('src/lib/cookie-consent.ts');
  const accepted = { version: 1, external: true, savedAt: Date.now() - 1000 };
  const rejected = { ...accepted, external: false };
  const cases = [
    ['fresh', undefined, true],
    ['malformed', '%broken', true],
    ['expired', encodeURIComponent(JSON.stringify({ ...accepted, savedAt: Date.now() - CONSENT_MAX_AGE * 1000 - 1000 })), true],
    ['old-version', encodeURIComponent(JSON.stringify({ ...accepted, version: 0 })), true],
    ['future', encodeURIComponent(JSON.stringify({ ...accepted, savedAt: Date.now() + 60000 })), true],
    ['accepted', encodeURIComponent(JSON.stringify(accepted)), false],
    ['rejected', encodeURIComponent(JSON.stringify(rejected)), false],
    ['analytics-only-v2', encodeURIComponent(JSON.stringify({ ...rejected, version:2, analytics:true })), false],
    ['reject-v2', encodeURIComponent(JSON.stringify({ ...rejected, version:2, analytics:false })), false],
    ['invalid-v2', encodeURIComponent(JSON.stringify({ ...accepted, version:2 })), true],
  ];
  for (const [name, value, banner] of cases) {
    const html = renderToStaticMarkup(React.createElement(Provider, { initialConsent: parseConsent(value) }, React.createElement(MapComponent, { src: 'https://www.google.com/maps/embed?pb=synthetic' })));
    assert.equal(html.includes('id="cookie-heading"'), banner, `${name}: SSR banner visibility`);
    assert.equal(html.includes('<iframe'), false, `${name}: no third-party iframe before browser validation`);
    assert.ok(html.includes('Configurar cookies del mapa'), `${name}: blocked map remains usable`);
    if (banner) assert.ok(html.includes('<noscript>') && html.includes('Activa JavaScript'), `${name}: JS-off explanation`);
  }
  const empty = () => null;
  let cookieValue;
  let headerReads = 0;
  const cookieNames = [];
  const Layout = load('src/app/layout.tsx', {
    'next/headers': { headers: async () => { headerReads++; return {}; }, cookies: async () => ({ get: (name) => { cookieNames.push(name); return cookieValue === undefined ? undefined : { value: cookieValue }; } }) },
    '@/components/PWARegister': { PWARegister: empty }, '@/components/UploadNotice': { UploadNotice: empty },
    '@/components/CookieConsentProvider': { CookieConsentProvider: Provider },
  }).default;
  for (const [name, value, banner] of cases) {
    cookieValue = value;
    const html = renderToStaticMarkup(await Layout({ children: React.createElement('main', null, 'Synthetic content') }));
    assert.equal(html.includes('id="cookie-heading"'), banner, `${name}: actual RootLayout passes validated cookie`);
  }
  assert.equal(headerReads, cases.length, 'per-request dynamic nonce rendering is retained');
  assert.ok(cookieNames.every((name) => name === CONSENT_COOKIE), 'only the preference cookie is read/serialized');
  console.log('PASS cookie SSR: ten request states including legacy/v2/invalid analytic consent, no iframe or metric effects before client validation, no-JS guidance, dynamic RootLayout cookie handoff.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
