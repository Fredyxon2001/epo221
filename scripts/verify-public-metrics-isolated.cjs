// Real aggregate/RPC checks, exclusively in the own disposable loopback stack.
// Refuse occupied fixture cohorts/expired data; never purge another test's rows.
const assert = require('node:assert/strict');
require('./assert-isolated.cjs').assertIsolatedEnvironment();
const { createClient } = require('@supabase/supabase-js');
const { createFixtures } = require('./flow-fixtures.cjs');
const { load } = require('./security-loader.cjs');
const { summarizeMetrics } = load('src/lib/performance/public-metrics.ts');
const fixtures = createFixtures(), service = fixtures.admin;
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const table = 'public_performance_daily', route = '/publico/conoce', device = 'desktop', metric = 'CLS';
const today = new Date().toISOString().slice(0, 10);
function dayOffset(offset) { const day = new Date(today + 'T12:00:00Z'); day.setUTCDate(day.getUTCDate() + offset); return day.toISOString().slice(0, 10); }
const oldest = dayOffset(-29), expired = dayOffset(-30), older = dayOffset(-31), days = [today, oldest, expired, older];
let reserved = false;
const validArgs = { p_route: route, p_device: device, p_samples: [{ name: metric, bucket: 4 }] };
function scoped(client = service) { return client.from(table).select('*').eq('route', route).eq('device', device).eq('metric', metric).order('day').order('bucket'); }
async function ownRows() { const r = await scoped(); assert.ifError(r.error); return r.data; }
async function summary() {
  const r = await service.rpc('read_public_metrics'); assert.ifError(r.error);
  const rows = r.data.filter(row => row.route === route && row.device === device && row.metric === metric);
  return summarizeMetrics(rows)[0];
}
async function insert(day, bucket, samples) {
  const r = await service.from(table).insert({ day, route, device, metric, bucket, samples }); assert.ifError(r.error);
}
async function beforeGlobalPurge() {
  assert.equal(new Date().toISOString().slice(0, 10), today, 'UTC day changed; restart the probe with a fresh boundary');
  const r = await service.from(table).select('day,route,device,metric,bucket').lt('day', oldest); assert.ifError(r.error);
  assert.ok(r.data.every(row => row.route === route && row.device === device && row.metric === metric && days.includes(row.day) && [2, 3, 4].includes(row.bucket)), 'Another test has expired rows; do not purge them');
}
async function main() {
  const oldRows = await service.from(table).select('day', { head: true, count: 'exact' }).lt('day', oldest);
  assert.ifError(oldRows.error); assert.equal(oldRows.count, 0, 'Refuse global purge while another test has expired rows');
  assert.equal((await ownRows()).length, 0, 'Fixture cohort must be empty; do not overwrite existing metrics');
  const actor = await fixtures.account('staff'); // A real authenticated JWT, without creating a school record.
  for (const [label, client] of [['anonymous', anon], ['authenticated', actor.client]]) {
    assert.ok((await client.rpc('record_public_metrics', validArgs)).error, label + ' may not invoke write RPC');
    assert.ok((await client.rpc('purge_public_metrics')).error, label + ' may not purge aggregates');
    assert.ok((await client.rpc('read_public_metrics')).error, label + ' may not read aggregate RPC directly');
    const read = await scoped(client); assert.ok(read.error || read.data.length === 0, label + ' may not read raw counters');
    const write = await client.from(table).insert({ day: today, route, device, metric, bucket: 4, samples: 1 }); assert.ok(write.error, label + ' may not write counters directly');
  }
  assert.equal((await ownRows()).length, 0, 'Denied clients changed aggregate data');
  reserved = true;
  await insert(oldest, 4, 19); await insert(expired, 3, 7); await insert(older, 2, 8);
  const rows = await ownRows();
  for (const row of rows) assert.equal(Object.keys(row).sort().join(','), 'bucket,day,device,metric,route,samples', 'Raw aggregate columns must not include PII or event identifiers');
  const hidden = await summary(); assert.equal(hidden.samples, null); assert.equal(hidden.p75UpperBound, null); assert.equal(hidden.p75Above, null);
  const before = JSON.stringify(await ownRows());
  const invalid = [
    { ...validArgs, p_route: '/alumno' }, { ...validArgs, p_route: '/publico?email=synthetic' },
    { ...validArgs, p_device: 'account' }, { ...validArgs, p_samples: null },
    { ...validArgs, p_samples: [] }, { ...validArgs, p_samples: [{ name: metric, bucket: 14 }] },
    { ...validArgs, p_samples: [{ name: metric, bucket: 4.5 }] }, { ...validArgs, p_samples: [{ name: metric, bucket: '4' }] },
    { ...validArgs, p_samples: [{ name: metric, bucket: 4, user_id: 'synthetic' }] },
    { ...validArgs, p_samples: [{ name: metric, bucket: 4 }, { name: metric, bucket: 5 }] },
  ];
  for (const args of invalid) { const r = await service.rpc('record_public_metrics', args); assert.ok(r.error, 'Invalid RPC input was accepted'); }
  assert.equal(JSON.stringify(await ownRows()), before, 'Rejected multi-sample payload must roll back all writes and not run purge');
  await beforeGlobalPurge();
  assert.ifError((await service.rpc('record_public_metrics', validArgs)).error);
  const visible = await summary(); assert.equal(visible.samples, 20); assert.equal(visible.p75UpperBound, 0.1); assert.equal(visible.p75Above, null);
  let current = await ownRows(); assert.equal(current.length, 2); assert.ok(current.some(row => row.day === oldest && row.samples === 19)); assert.ok(current.some(row => row.day === today && row.samples === 1));
  assert.ok(!current.some(row => row.day === expired || row.day === older), 'Record RPC must purge dates outside 30 UTC days');
  await insert(expired, 3, 7);
  await beforeGlobalPurge();
  assert.ifError((await service.rpc('purge_public_metrics')).error);
  current = await ownRows(); assert.equal(current.length, 2); assert.ok(current.every(row => row.day >= oldest), 'Purge must retain the inclusive 30-day boundary');
  if (process.argv.includes('--web')) {
    const base = process.env.FLOW_BASE_URL; const url = new URL(base); assert.equal(url.port, '3004', 'Only own isolated web3004 allowed');
    const cookie = 'epo221-cookie-consent=' + encodeURIComponent(JSON.stringify({ version: 2, external: false, analytics: true, savedAt: Date.now() }));
    async function send(body, consent = cookie) { return fetch(base + '/api/public/metricas', { method: 'POST', headers: { origin: base, 'content-type': 'application/json', cookie: consent }, body: JSON.stringify(body) }); }
    const payload = { route, device, samples: [{ name: metric, value: 0.1 }] };
    assert.equal((await send({ ...payload, user_id: 'synthetic' })).status, 400, 'HTTP collector must reject extra identity fields');
    assert.equal((await send({ ...payload, route: '/admin' })).status, 400, 'HTTP collector must reject private pages');
    assert.equal((await send(payload, '')).status, 403, 'HTTP collector must require optional consent');
    assert.equal((await summary()).samples, 20, 'Rejected HTTP inputs must not record counters');
    await beforeGlobalPurge();
    assert.equal((await send(payload)).status, 204); assert.equal((await summary()).samples, 21);
    console.log('PASS isolated metrics HTTP: strict public payload, consent and real aggregate recording.');
  }
  console.log('PASS isolated metrics: anon/auth write/read/purge denied, invalid input atomic, six anonymous columns, cohort19 hidden/20 visible, inclusive30 UTC days and purge.');
}
(async () => {
  let failure;
  try { await main(); } catch (error) { failure = error; }
  try {
    if (reserved) {
      const removed = await service.from(table).delete().eq('route', route).eq('device', device).eq('metric', metric).in('day', days).in('bucket', [2, 3, 4]); assert.ifError(removed.error);
      assert.equal((await ownRows()).length, 0, 'Metrics fixture cleanup incomplete');
      console.log('PASS isolated metric cohort removed; unrelated counters preserved.');
    }
  } catch (error) { failure = failure || error; }
  try { await fixtures.cleanup(); } catch (error) { failure = failure || error; }
  if (failure) throw failure;
})().catch(error => { console.error('FAIL isolated public metrics: ' + error.message); process.exitCode = 1; });
