// Real loopback HTTP contracts, including a real 20-second upstream deadline.
// No browser, credentials, hosted endpoints, fixtures or database writes.
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { startMetricsProxy } = require('./metrics-consent-proxy.cjs');

function request(base, path, { method = 'GET', headers = {}, body, chunked = false, agent = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(base, { path, method, headers, agent }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    });
    req.setTimeout(25_000, () => req.destroy(new Error('Unit request exceeded its deadline')));
    req.on('error', reject);
    if (chunked) { req.write(body.slice(0, 2048)); req.end(body.slice(2048)); }
    else req.end(body);
  });
}
function connectDenied(base) {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
    let response = '';
    socket.setTimeout(2000, () => socket.destroy(new Error('CONNECT rejection timeout')));
    socket.on('connect', () => socket.write('CONNECT external.invalid:443 HTTP/1.1\r\nHost: external.invalid:443\r\n\r\n'));
    socket.on('data', chunk => response += chunk);
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}
function connectExchange(base, authority, nextBytes, { pipeline = false, extraHeaders = {} } = {}) {
  return new Promise((resolve, reject) => {
    const address = new URL(base), socket = net.createConnection({ host: address.hostname, port: Number(address.port) });
    let buffer = Buffer.alloc(0), connected = false;
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('CONNECT parser exchange deadline')); }, 2500);
    const headers = Object.entries(extraHeaders).map(([name, value]) => name + ': ' + value + '\r\n').join('');
    const first = Buffer.from('CONNECT ' + authority + ' HTTP/1.1\r\nHost: ' + authority + '\r\n' + headers + '\r\n');
    socket.on('connect', () => socket.write(pipeline ? Buffer.concat([first, Buffer.from(nextBytes)]) : first));
    const data = chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const end = buffer.indexOf('\r\n\r\n'); if (end < 0) return;
        const response = buffer.subarray(0, end).toString(); buffer = buffer.subarray(end + 4);
        const status = Number(/^HTTP\/1.1 (\d+)/.exec(response)?.[1]);
        if (!connected && status === 200) {
          connected = true;
          if (!pipeline) socket.write(nextBytes);
          continue;
        }
        clearTimeout(timer); socket.removeListener('data', data); socket.removeListener('error', failed);
        resolve({ status, socket, response, head: buffer }); return;
      }
    };
    const failed = error => { clearTimeout(timer); socket.destroy(); reject(error); };
    socket.on('data', data); socket.on('error', failed);
  });
}
function wsRequest(base, target, host, extra = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(base, { path: target, agent: false, headers: {
      Host: host, Connection: 'Upgrade', Upgrade: 'websocket',
      'Sec-WebSocket-Key': 'MDEyMzQ1Njc4OWFiY2RlZg==', 'Sec-WebSocket-Version': '13', ...extra,
    } }, res => { res.resume(); resolve({ status: res.statusCode }); });
    req.setTimeout(25_000, () => req.destroy(new Error('WS handshake exceeded deadline')));
    req.on('error', reject);
    req.on('upgrade', (res, socket, head) => { req.setTimeout(0); resolve({ status: res.statusCode, socket, head, headers: res.headers }); });
    req.end();
  });
}
async function websocketEcho(socket) {
  const message = Buffer.from('local-hmr-echo'), mask = Buffer.from([1, 2, 3, 4]);
  const frame = Buffer.concat([Buffer.from([0x81, 0x80 | message.length]), mask, Buffer.from(message.map((byte, index) => byte ^ mask[index % 4]))]);
  const echoed = new Promise((resolve, reject) => {
    let bytes = Buffer.alloc(0);
    const timer = setTimeout(() => { cleanup(); reject(new Error('WS echo deadline')); }, 2000);
    const cleanup = () => { clearTimeout(timer); socket.removeListener('data', data); socket.removeListener('error', failed); };
    const failed = error => { cleanup(); reject(error); };
    const data = chunk => {
      bytes = Buffer.concat([bytes, chunk]);
      if (bytes.length >= message.length + 2) { cleanup(); resolve(bytes); }
    };
    socket.on('data', data); socket.on('error', failed);
  });
  socket.write(frame);
  const response = await echoed;
  assert.equal(response[0], 0x81); assert.equal(response[1], message.length);
  assert.deepEqual(response.subarray(2), message);
}
(async () => {
  const seen = [], sockets = new Set(), captured = [];
  const upstream = http.createServer((req, res) => {
    seen.push({ method: req.method, path: req.url, auth: req.headers.authorization, cookie: req.headers.cookie });
    if (req.url === '/publico/hang') return;
    if (req.url === '/publico/redirect-external') { res.writeHead(307, { Location: 'https://external.invalid/publico' }); res.end(); return; }
    if (req.url === '/publico/redirect-local') { res.writeHead(307, { Location: '/publico/contacto' }); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'self'", 'Set-Cookie': 'private-session=synthetic; Path=/' });
    if (req.method === 'HEAD') { res.end(); return; }
    res.write('<h1>Local');
    setImmediate(() => res.end(' public response</h1>'));
  });
  const wsSeen = [];
  upstream.on('upgrade', (req, socket, head) => {
    wsSeen.push({ path: req.url, cookie: req.headers.cookie, auth: req.headers.authorization, origin: req.headers.origin });
    if (req.url === '/_next/hmr?id=hang') return;
    if (req.url === '/_next/hmr?id=badaccept') { socket.end('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: invalid\r\n\r\n'); return; }
    const accept = require('node:crypto').createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\nSet-Cookie: synthetic-private=ignored\r\n\r\n');
    let bytes = head;
    const echo = chunk => {
      bytes = Buffer.concat([bytes, chunk]);
      if (bytes.length < 6 || bytes.length < 6 + (bytes[1] & 0x7f)) return;
      const length = bytes[1] & 0x7f, mask = bytes.subarray(2, 6);
      assert.equal(bytes[1] & 0x80, 0x80, 'Client frame must be masked');
      const message = Buffer.from(bytes.subarray(6, 6 + length).map((byte, index) => byte ^ mask[index % 4]));
      bytes = bytes.subarray(6 + length);
      socket.write(Buffer.concat([Buffer.from([0x81, message.length]), message]));
    };
    socket.on('data', echo); socket.on('error', () => {});
  });
  upstream.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + upstream.address().port;
  const proxies = [], agents = [];
  try {
    for (const invalid of ['http://external.invalid', 'https://example.invalid/path', 'https://name:synthetic@example.invalid', 'file:///tmp/no']) {
      await assert.rejects(() => startMetricsProxy(invalid, () => {}));
    }
    await assert.rejects(() => startMetricsProxy('https://example.invalid', () => {}, { mode: 'forward' }));
    const payload = { route: '/publico/contacto', device: 'mobile', samples: [{ name: 'INP', value: 120 }] };
    const serialized = JSON.stringify(payload);
    for (const mode of ['reverse', 'forward']) {
      const proxy = await startMetricsProxy(origin, value => captured.push(value), { mode }); proxies.push(proxy);
      const target = path => mode === 'forward' ? origin + path : path;
      const headers = extra => ({ ...(mode === 'forward' ? { Host: new URL(origin).host } : {}), ...extra });
      const send = (path, options = {}) => request(proxy.base, target(path), { ...options, headers: headers(options.headers) });
      assert.equal(new URL(proxy.base).hostname, '127.0.0.1');
      const response = await send('/publico/contacto?local=1', { headers: {
        Cookie: 'private-session=synthetic; epo221-cookie-consent=synthetic-v1; other=synthetic',
        Authorization: 'synthetic-not-a-credential',
      } });
      assert.equal(response.status, 200); assert.equal(response.body, '<h1>Local public response</h1>');
      assert.equal(response.headers['content-security-policy'], "default-src 'self'");
      assert.equal(response.headers['set-cookie'], undefined);
      assert.equal(seen.at(-1).cookie, 'epo221-cookie-consent=synthetic-v1');
      assert.equal(seen.at(-1).auth, undefined);
      // All consent generations reach SSR unchanged; no interpretation by proxy.
      for (const cookie of ['synthetic-v2', 'synthetic-expired', 'synthetic-reject']) {
        assert.equal((await send('/publico/contacto', { headers: { Cookie: 'epo221-cookie-consent=' + cookie } })).status, 200);
        assert.equal(seen.at(-1).cookie, 'epo221-cookie-consent=' + cookie);
      }
      for (const path of ['/_next/static/chunk.js', '/img/logo.png', '/favicon.ico', '/_next/image?url=%2Fimg%2Flogo.png&w=32&q=75']) assert.equal((await send(path)).status, 200);
      assert.equal((await send('/publico/contacto', { method: 'HEAD' })).body, '');
      const localRedirect = await send('/publico/redirect-local');
      assert.equal(localRedirect.status, 307);
      assert.equal(localRedirect.headers.location, (mode === 'forward' ? origin : proxy.base) + '/publico/contacto');
      assert.equal((await send('/publico/redirect-external')).status, 502);
      const before = seen.length;
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) assert.equal((await send('/publico/contacto', { method, body: '{}' })).status, 405);
      assert.equal((await send('/api/public/metricas?extra=1', { method: 'POST', body: serialized })).status, 405);
      for (const path of ['/admin', '/api/private', '/api/public/metricas', '/_next/image?url=https%3A%2F%2Fexternal.invalid%2Fx']) assert.equal((await send(path)).status, 403);
      for (const path of ['//external.invalid/publico', '/publico/../admin', '/publico/%2e%2e/admin', '/publico/%2Fexternal.invalid']) assert.equal((await send(path)).status, 400);
      assert.equal((await send('/publico/contacto', { headers: { Origin: 'https://external.invalid' } })).status, 400);
      assert.equal((await send('/publico/contacto', { headers: { Host: 'external.invalid' } })).status, 400);
      assert.equal((await send('/publico/contacto', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 400);
      const wrongTarget = mode === 'forward' ? 'http://external.invalid/publico' : origin + '/publico';
      assert.equal((await request(proxy.base, wrongTarget, { headers: headers() })).status, 400);
      if (mode === 'forward') assert.equal((await request(proxy.base, '/publico', { headers: headers() })).status, 400);
      assert.match(await connectDenied(proxy.base), /^HTTP\/1.1 405 /);
      assert.equal(seen.length, before, 'Rejected targets or mutations reached upstream');
      for (const body of ['not json', JSON.stringify({ ...payload, student: 'synthetic-extra-field' }), JSON.stringify({ ...payload, route: '/admin' })]) {
        assert.equal((await send('/api/public/metricas', { method: 'POST', body })).status, 400);
      }
      assert.equal((await send('/api/public/metricas', { method: 'POST', body: 'x'.repeat(4097), headers: { 'Content-Length': '4097' } })).status, 413);
      assert.equal((await send('/api/public/metricas', { method: 'POST', body: 'x'.repeat(4097), chunked: true })).status, 413);
      const agent = new http.Agent({ keepAlive: true }); agents.push(agent);
      assert.equal((await send('/api/public/metricas', { method: 'POST', body: serialized, headers: { Origin: mode === 'forward' ? origin : proxy.base }, agent })).status, 204);
      assert.equal((await send('/api/public/metricas', { method: 'POST', body: serialized.padEnd(4096, ' '), agent })).status, 204);
      assert.deepEqual(captured.at(-1), payload);
      assert.equal(proxy.counts.metricPosts, 2);
      assert.equal(seen.length, before, 'Metric POST reached upstream');
      assert.ok(proxy.counts.rejected >= 20);
    }
    // Only forward HTTP loopback supports Next dev HMR; all other upgrades fail.
    const reverse = proxies[0], forward = proxies[1], host = new URL(origin).host;
    const ws = await wsRequest(forward.base, origin + '/_next/hmr?id=local-qa_1', host, {
      Origin: origin, Cookie: 'synthetic-private=strip', Authorization: 'synthetic-strip',
    });
    assert.equal(ws.status, 101); assert.equal(ws.headers['set-cookie'], undefined);
    assert.equal(wsSeen.at(-1).cookie, undefined); assert.equal(wsSeen.at(-1).auth, undefined);
    assert.equal(wsSeen.at(-1).origin, undefined);
    await websocketEcho(ws.socket);
    // Both forms used by HTTP WS proxy clients select the same fixed upstream.
    for (const target of ['/_next/hmr?id=origin-form', origin.replace('http:', 'ws:') + '/_next/hmr?id=ws-form']) {
      const other = await wsRequest(forward.base, target, host); assert.equal(other.status, 101);
      await websocketEcho(other.socket); other.socket.destroy();
    }
    assert.equal(forward.counts.hmrConnections, 3);
    // CONNECT never exposes a raw upstream tunnel: the local parser still owns
    // the bytes and permits only the exact HMR upgrade after its 200 response.
    const wsAfterConnect = 'GET /_next/hmr?id=connect-qa HTTP/1.1\r\nHost: ' + host +
      '\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key: MDEyMzQ1Njc4OWFiY2RlZg==\r\nSec-WebSocket-Version: 13\r\nOrigin: ' + origin + '\r\n\r\n';
    for (const pipeline of [false, true]) {
      const connected = await connectExchange(forward.base, host, wsAfterConnect, { pipeline });
      assert.equal(connected.status, 101); assert.equal(connected.head.length, 0);
      await websocketEcho(connected.socket); connected.socket.destroy();
    }
    assert.equal(forward.counts.hmrConnects, 2); assert.equal(forward.counts.hmrConnections, 5);
    const seenBeforeConnectDenial = seen.length, wsBeforeConnectDenial = wsSeen.length;
    for (const request of [
      'POST /api/public/metricas HTTP/1.1\r\nHost: ' + host + '\r\nContent-Length: 2\r\n\r\n{}',
      'GET /publico/contacto HTTP/1.1\r\nHost: ' + host + '\r\n\r\n',
      'GET ' + origin + '/publico/contacto HTTP/1.1\r\nHost: ' + host + '\r\n\r\n',
      'GET /_next/other?id=qa HTTP/1.1\r\nHost: ' + host + '\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
    ]) {
      const denied = await connectExchange(forward.base, host, request);
      assert.equal(denied.status, 405); denied.socket.destroy();
    }
    const tls = await connectExchange(forward.base, host, Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05, 0x01, 0, 0, 0, 0]));
    assert.equal(tls.status, 400); tls.socket.destroy();
    for (const extraHeaders of [{ Cookie: 'synthetic-denied' }, { Authorization: 'synthetic-denied' }, { 'Proxy-Authorization': 'synthetic-denied' }, { Origin: 'http://external.invalid' }]) {
      const denied = await connectExchange(forward.base, host, wsAfterConnect, { extraHeaders });
      assert.equal(denied.status, 405); denied.socket.destroy();
    }
    assert.equal(seen.length, seenBeforeConnectDenial, 'HTTP over CONNECT reached upstream');
    assert.equal(wsSeen.length, wsBeforeConnectDenial, 'Denied CONNECT/upgrade reached upstream');

    const beforeUpgradeRejects = wsSeen.length;
    for (const target of [
      origin + '/_next/other?id=qa', origin + '/_next/hmr', origin + '/_next/hmr?id=',
      origin + '/_next/hmr?id=' + 'x'.repeat(129), origin + '/_next/hmr?id=qa&extra=1',
      origin + '/_next/hmr?id=%2Fexternal', 'http://external.invalid/_next/hmr?id=qa',
    ]) assert.equal((await wsRequest(forward.base, target, host)).status, 405);
    assert.equal((await wsRequest(reverse.base, '/_next/hmr?id=qa', new URL(reverse.base).host)).status, 405);
    assert.equal((await wsRequest(forward.base, origin + '/_next/hmr?id=qa', host, { Origin: 'http://external.invalid' })).status, 405);
    assert.equal(wsSeen.length, beforeUpgradeRejects, 'Denied upgrade reached upstream');
    assert.equal((await wsRequest(forward.base, origin + '/_next/hmr?id=badaccept', host)).status, 502);
    const hangingHandshake = wsRequest(forward.base, origin + '/_next/hmr?id=hang', host);
    const proxy = proxies[0];
    const started = Date.now();
    assert.equal((await request(proxy.base, '/publico/hang')).status, 504);
    assert.ok(Date.now() - started >= 19_500, 'Upstream timeout was shortened');
    assert.ok(Date.now() - started < 24_000, 'Upstream timeout was not bounded');
    assert.equal(proxy.counts.timedOut, 1);    assert.equal((await hangingHandshake).status, 504);
    assert.equal(forward.counts.timedOut, 1);
    assert.equal(ws.socket.destroyed, false, 'Healthy HMR connection inherited handshake deadline');
    const wsClosed = new Promise(resolve => ws.socket.once('close', resolve));
    await forward.close(); await wsClosed;

    // close must also cancel an active upstream and idle keepalive connections.
    const pending = request(proxy.base, '/publico/hang').then(() => false, () => true);
    await new Promise(resolve => setTimeout(resolve, 25));
    const closing = proxy.close();
    assert.equal(proxy.close(), closing, 'close is not idempotent');
    await closing; assert.equal(await pending, true);
    assert.equal(captured.length, 4);
    // Closing during an asynchronous capture also retires its deadline timer.
    let entered;
    const inCallback = new Promise(resolve => { entered = resolve; });
    const pendingProxy = await startMetricsProxy(origin, () => { entered(); return new Promise(() => {}); });
    proxies.push(pendingProxy);
    const pendingCapture = request(pendingProxy.base, '/api/public/metricas', { method: 'POST', body: JSON.stringify(payload) }).then(() => false, () => true);
    await inCallback; await pendingProxy.close();
    assert.equal(await pendingCapture, true);
    assert.equal(pendingProxy.counts.metricPosts, 0);
    console.log('PASS metrics HTTP proxy: reverse/forward loopback, public stream/HEAD, consent-only cookies, exact validated POST/4096 bytes/keepalive, mutation/origin/CONNECT/redirect isolation, real20s HTTP/WS handshake deadlines, scoped HMR handshake/masked echo and CONNECT parser re-entry (including pipelined head/TLS rejection), and socket cleanup; no hosted requests.');
  } finally {
    for (const agent of agents) agent.destroy();
    await Promise.all(proxies.map(proxy => proxy.close()));
    await new Promise(resolve => { upstream.close(resolve); for (const socket of sockets) socket.destroy(); });
  }
})().catch(() => { console.error('FAIL metrics proxy loopback contracts; private diagnostics suppressed.'); process.exitCode = 1; });
