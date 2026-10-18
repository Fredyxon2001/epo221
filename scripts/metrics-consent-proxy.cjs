// Test-only anonymous HTTP proxy. Keepalive metrics terminate here even when the
// browser has destroyed the old document. Never use this as an application server.
const http = require('node:http');
const https = require('node:https');
const { createHash } = require('node:crypto');
const { load } = require('./security-loader.cjs');
const { parsePublicMetricPayload } = load('src/lib/performance/public-metrics.ts');
const TIMEOUT_MS = 20_000, MAX_BODY = 4096;
const PUBLIC_PATH = /^\/(?:publico(?:\/|$)|_next\/|img\/|videos\/|albumes\/|descargas\/|cookies$|privacidad$|app-movil$|favicon\.ico$|manifest\.json$|sw\.js$|offline\.html$)/;
const unsafeTarget = value => !value.startsWith('/') || value.startsWith('//') || /[\\#\u0000-\u0020]/.test(value) || /%(?:2f|5c|00|0a|0d)/i.test(value.split('?')[0]);

async function startMetricsProxy(upstream, onPayload, { mode = 'reverse' } = {}) {
  const origin = new URL(upstream);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash ||
      (origin.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname))) {
    throw new Error('Metrics proxy requires an explicit HTTPS origin or HTTP loopback origin');
  }
  if (!['reverse', 'forward'].includes(mode) || (mode === 'forward' && origin.protocol !== 'http:')) throw new Error('Forward metrics proxy requires an explicit HTTP loopback origin');
  if (typeof onPayload !== 'function') throw new TypeError('Metrics proxy requires a payload callback');
  const sockets = new Set(), outgoing = new Set(), timers = new Set(), hmrConnectSockets = new WeakSet();
  const deadline = fn => {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, TIMEOUT_MS);
    timers.add(timer); return timer;
  };
  const clearDeadline = timer => { clearTimeout(timer); timers.delete(timer); };
  const counts = { upstreamRequests: 0, metricPosts: 0, rejected: 0, upstreamErrors: 0, timedOut: 0, hmrConnections: 0, hmrConnects: 0 };
  let base, closing = false, closePromise;
  const reply = (res, status) => {
    if (!res.headersSent) res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Length': '0' });
    res.end();
  };
  const server = http.createServer(async (req, res) => {
    const reject = status => { counts.rejected++; req.resume(); reply(res, status); };
    if (hmrConnectSockets.has(req.socket)) { reject(405); return; }
    const rawTarget = req.url || '';
    const target = mode === 'forward' && rawTarget.startsWith(origin.origin + '/') ? rawTarget.slice(origin.origin.length) : rawTarget;
    const expectedHost = mode === 'forward' ? origin.host : new URL(base).host;
    const expectedOrigin = mode === 'forward' ? origin.origin : base;
    // Reverse accepts only origin-form. Forward accepts only absolute-form for
    // the one HTTP loopback origin; neither can become a general network proxy.
    if (closing || (mode === 'forward' && target === rawTarget) || req.headers.host !== expectedHost || unsafeTarget(target) ||
        (req.headers.origin && req.headers.origin !== expectedOrigin) || req.headers['sec-fetch-site'] === 'cross-site') {
      reject(400); return;
    }
    let destination;
    try { destination = new URL(target, origin); } catch { reject(400); return; }
    if (destination.origin !== origin.origin || destination.pathname !== target.split('?')[0]) { reject(400); return; }
    if (req.method === 'POST' && target === '/api/public/metricas') {
      if (Number(req.headers['content-length']) > MAX_BODY) { reject(413); return; }
      let size = 0;
      const chunks = [];
      const timer = deadline(() => { counts.timedOut++; reject(408); req.destroy(); });
      const data = chunk => {
        size += chunk.length;
        if (size > MAX_BODY) { cleanup(); reject(413); return; }
        chunks.push(chunk);
      };
      const cleanup = () => {
        clearDeadline(timer);
        req.removeListener('data', data);
        req.removeListener('end', end);
        req.removeListener('error', failed);
        req.removeListener('aborted', failed);
      };
      const failed = () => { cleanup(); if (!res.destroyed) reply(res, 400); };
      const end = async () => {
        // Keep the deadline active while the optional callback is pending too.
        req.removeListener('data', data);
        let payload;
        try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { cleanup(); reject(400); return; }
        if (!parsePublicMetricPayload(payload)) { cleanup(); reject(400); return; }
        try {
          await onPayload(payload);
          if (!res.writableEnded && !res.destroyed) { counts.metricPosts++; reply(res, 204); }
        } catch { if (!res.writableEnded && !res.destroyed) reply(res, 500); }
        finally { cleanup(); }
      };
      req.on('data', data); req.on('end', end); req.on('error', failed); req.on('aborted', failed);
      return;
    }
    // A POST has no forwarding branch, regardless of its path or payload.
    if (!['GET', 'HEAD'].includes(req.method)) { reject(405); return; }
    if (!PUBLIC_PATH.test(destination.pathname)) { reject(403); return; }
    if (destination.pathname === '/_next/image') {
      const image = destination.searchParams.get('url') || '';
      if (unsafeTarget(image) || !/^\/(?:img|videos|albumes)\//.test(image)) { reject(403); return; }
    }
    const headers = {};
    for (const name of ['accept', 'accept-encoding', 'range', 'if-none-match', 'if-modified-since', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-url']) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    // Forward only the consent preference for SSR. Session/authorization and
    // arbitrary client headers are intentionally absent from the upstream call.
    const consent = String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('epo221-cookie-consent='));
    if (consent) headers.cookie = consent;
    counts.upstreamRequests++;
    const transport = origin.protocol === 'https:' ? https : http;
    let finished = false;
    const proxy = transport.request(destination, { method: req.method, headers, agent: false }, response => {
      const responseHeaders = { ...response.headers };
      for (const name of ['set-cookie', 'connection', 'keep-alive', 'transfer-encoding', 'proxy-authenticate', 'trailer', 'upgrade']) delete responseHeaders[name];
      if (responseHeaders.location) {
        let location;
        try { location = new URL(responseHeaders.location, destination); } catch { location = null; }
        if (!location || location.origin !== origin.origin || unsafeTarget(location.pathname) || !PUBLIC_PATH.test(location.pathname)) {
          counts.rejected++; response.destroy(); proxy.destroy(); reply(res, 502); return;
        }
        responseHeaders.location = (mode === 'forward' ? origin.origin : base) + location.pathname + location.search;
      }
      res.writeHead(response.statusCode || 502, responseHeaders);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    outgoing.add(proxy);
    const timer = deadline(() => {
      if (finished) return;
      counts.timedOut++; proxy.destroy();
      if (res.headersSent) res.destroy(); else reply(res, 504);
    });
    proxy.on('error', () => {
      counts.upstreamErrors++;
      if (!res.destroyed && !res.writableEnded) { if (res.headersSent) res.destroy(); else reply(res, 502); }
    });
    proxy.on('close', () => { finished = true; clearDeadline(timer); outgoing.delete(proxy); });
    res.on('close', () => { if (!res.writableFinished) proxy.destroy(); });
    proxy.end();
  });
  server.on('connect', (req, socket, head) => {
    // Chromium sends CONNECT even for a plain ws:// loopback target. This is
    // not a network tunnel: re-enter our own HTTP parser so only the separately
    // validated Next HMR upgrade can proceed. No bytes go raw to the upstream.
    const deny = () => {
      counts.rejected++;
      socket.end('HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    };
    if (closing || mode !== 'forward' || origin.protocol !== 'http:' || hmrConnectSockets.has(socket) ||
        req.url !== origin.host || req.headers.host !== origin.host ||
        req.headers.authorization || req.headers['proxy-authorization'] || req.headers.cookie ||
        (req.headers.origin && req.headers.origin !== origin.origin) || req.headers['sec-fetch-site'] === 'cross-site') {
      deny(); return;
    }
    hmrConnectSockets.add(socket); counts.hmrConnects++;
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    server.emit('connection', socket);
    if (head.length) socket.unshift(head);
  });
  server.on('upgrade', (req, socket, head) => {
    const deny = (status = 405) => {
      counts.rejected++;
      if (!socket.destroyed) socket.end('HTTP/1.1 ' + status + ' Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    };
    let target = req.url || '';
    for (const prefix of [origin.origin, origin.origin.replace('http:', 'ws:')]) {
      if (target.startsWith(prefix + '/')) { target = target.slice(prefix.length); break; }
    }
    const key = String(req.headers['sec-websocket-key'] || '');
    // Only Next dev's exact local HMR endpoint may upgrade. In particular no
    // CONNECT, remote host, extra query parameters or arbitrary WS endpoint.
    if (closing || mode !== 'forward' || origin.protocol !== 'http:' || req.method !== 'GET' ||
        req.headers.host !== origin.host || (req.headers.origin && req.headers.origin !== origin.origin) ||
        req.headers['sec-fetch-site'] === 'cross-site' ||
        !/^\/_next\/hmr\?id=[A-Za-z0-9_-]{1,128}$/.test(target) ||
        String(req.headers.upgrade || '').toLowerCase() !== 'websocket' ||
        !String(req.headers.connection || '').toLowerCase().split(/\s*,\s*/).includes('upgrade') ||
        req.headers['sec-websocket-version'] !== '13' || !/^[A-Za-z0-9+/]{22}==$/.test(key)) {
      deny(); return;
    }
    const expectedAccept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    const handshake = http.request(new URL(target, origin), {
      method: 'GET', agent: false,
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' },
    });
    outgoing.add(handshake); counts.upstreamRequests++;
    let connected = false;
    const timer = deadline(() => { counts.timedOut++; handshake.destroy(); deny(504); });
    handshake.on('response', response => { response.resume(); clearDeadline(timer); handshake.destroy(); deny(502); });
    handshake.on('upgrade', (response, peer, upstreamHead) => {
      clearDeadline(timer); outgoing.delete(handshake);
      if (closing || socket.destroyed || response.statusCode !== 101 ||
          String(response.headers.upgrade || '').toLowerCase() !== 'websocket' ||
          response.headers['sec-websocket-accept'] !== expectedAccept) {
        peer.destroy(); deny(502); return;
      }
      connected = true; counts.hmrConnections++;
      sockets.add(peer); peer.on('close', () => sockets.delete(peer));
      socket.on('close', () => peer.destroy()); peer.on('close', () => socket.destroy());
      socket.on('error', () => peer.destroy()); peer.on('error', () => socket.destroy());
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + expectedAccept + '\r\n\r\n');
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) peer.write(head);
      // The handshake alone has a deadline. A healthy HMR socket remains alive
      // until its browser disconnects or close() retires both ends.
      socket.pipe(peer); peer.pipe(socket);
    });
    handshake.on('error', () => { counts.upstreamErrors++; if (!connected && !closing) deny(502); });
    handshake.on('close', () => { clearDeadline(timer); outgoing.delete(handshake); });
    socket.on('close', () => { if (!connected) handshake.destroy(); });
    handshake.end();
  });
  server.headersTimeout = TIMEOUT_MS;
  server.requestTimeout = TIMEOUT_MS;
  server.on('connection', socket => { sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + server.address().port;
  const close = () => closePromise || (closePromise = new Promise((resolve, reject) => {
    closing = true;
    server.close(error => error ? reject(error) : resolve());
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const request of outgoing) request.destroy();
    for (const socket of sockets) socket.destroy();
  }));
  return { base, close, counts };
}

module.exports = { startMetricsProxy };
