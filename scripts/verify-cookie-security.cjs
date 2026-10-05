// Verificación aislada: no requiere usuarios, credenciales ni cambios en Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load(file, modules = {}, environment = 'production') {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => modules[name] ?? require(name),
    process: { env: { NODE_ENV: environment } }, URL, console });
  return exports;
}

async function main() {
  const { parseConsent, safeMapUrl, CONSENT_MAX_AGE } = load('src/lib/cookie-consent.ts');
  const now = Date.now();
  const encode = (data) => encodeURIComponent(JSON.stringify(data));
  assert.equal(parseConsent(undefined, now), null);
  assert.equal(parseConsent('%invalid', now), null);
  for (const data of [null, { version: 2, external: true, savedAt: now },
    { version: 1, external: 'true', savedAt: now },
    { version: 1, external: true, savedAt: now + 1 },
    { version: 1, external: true, savedAt: now - CONSENT_MAX_AGE * 1000 }]) {
    assert.equal(parseConsent(encode(data), now), null);
  }
  for (const external of [true, false]) {
    assert.equal(parseConsent(encode({ version: 1, external, savedAt: now }), now).external, external);
  }
  assert.ok(safeMapUrl('https://www.google.com/maps/embed?pb=example'));
  assert.ok(safeMapUrl('https://www.google.com/maps?q=Escuela&output=embed'));
  for (const url of ['javascript:alert(1)', 'http://www.google.com/maps/embed',
    'https://www.google.com.evil.test/maps/embed', 'https://www.google.com/search',
    'https://user@www.google.com/maps/embed', 'https://www.google.com:444/maps/embed']) {
    assert.equal(safeMapUrl(url), null);
  }
  const production = load('src/lib/supabase/cookie-options.ts').authCookieOptions;
  assert.equal(production.secure, true);
  assert.equal(production.sameSite, 'lax');
  assert.equal(production.path, '/');
  assert.equal(production.httpOnly, false); // La arquitectura SSR actual lo necesita.
  assert.equal(load('src/lib/supabase/cookie-options.ts', {}, 'development').authCookieOptions.secure, false);

  for (const scenario of [
    { route: '/admin', user: null, refresh: true, target: '/login' },
    { route: '/alumno', user: { id: 'test-user' }, refresh: true, changePassword: true, target: '/cambiar-password' },
    { route: '/login', user: { id: 'test-user' }, refresh: true, target: '/profesor' },
    { route: '/profesor', user: { id: 'test-user' }, refresh: true },
    { route: '/publico', user: null, refresh: true },
    { route: '/publico', user: null, refresh: false },
  ]) {
    const req = new NextRequest(`https://example.test${scenario.route}`);
    let receivedOptions;
    const createServerClient = (_url, _key, options) => {
      receivedOptions = options.cookieOptions;
      return {
        auth: { getUser: async () => {
          if (scenario.refresh) options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'synthetic-test', options: production }]);
          return { data: { user: scenario.user } };
        } },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
          debe_cambiar_password: scenario.changePassword ?? false, rol: 'profesor',
        } }) }) }) }),
      };
    };
    const { middleware } = load('src/middleware.ts', {
      'next/server': { NextRequest, NextResponse },
      '@supabase/ssr': { createServerClient },
      '@/lib/supabase/cookie-options': { authCookieOptions: production },
    });
    const result = await middleware(req);
    assert.equal(receivedOptions.secure, true);
    if (scenario.target) assert.equal(new URL(result.headers.get('location')).pathname, scenario.target);
    if (scenario.refresh) {
      assert.equal(req.cookies.get('sb-test-auth-token').value, 'synthetic-test');
      assert.equal(result.cookies.get('sb-test-auth-token').value, 'synthetic-test');
      assert.match(result.headers.get('set-cookie'), /Secure/);
      assert.match(result.headers.get('set-cookie'), /SameSite=lax/i);
      assert.equal(result.headers.get('cache-control'), 'private, no-store');
    }
    if (!scenario.refresh && !scenario.user) assert.equal(result.headers.get('cache-control'), null);
  }
  const handlers = {};
  const precached = [];
  const cached = [];
  const origin = 'https://example.test';
  const offline = new Response('offline');
  let response;
  const worker = {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; }, skipWaiting() {} },
    location: { origin }, URL, Response,
    caches: {
      open: async () => ({ addAll: async (items) => precached.push(...items),
        match: async () => undefined, put: async (req) => cached.push(req.url) }),
      match: async (name) => { assert.equal(name, '/offline.html'); return offline; },
    },
    fetch: async () => { if (response instanceof Error) throw response; return response; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), worker);
  let pending;
  handlers.install({ waitUntil: (promise) => { pending = promise; } });
  await pending;
  assert.deepEqual(precached, ['/offline.html', '/manifest.json']);
  for (const cacheControl of ['private, no-store', 'no-store', 'public, max-age=60']) {
    response = new Response('asset', { headers: { 'Cache-Control': cacheControl } });
    const before = cached.length;
    handlers.fetch({ request: new Request(`${origin}/asset.js`), respondWith: (promise) => { pending = promise; } });
    await pending;
    assert.equal(cached.length - before, cacheControl.startsWith('public') ? 1 : 0);
  }
  response = new Error('offline');
  handlers.fetch({ request: { method: 'GET', url: `${origin}/admin`, mode: 'navigate' },
    respondWith: (promise) => { pending = promise; } });
  assert.equal(await pending, offline);
  console.log('PASS: consentimiento válido/corrupto/vencido, URLs de mapas, atributos de cookies, renovación, 3 redirecciones sin perder sesión y caché PWA sin HTML privado.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
