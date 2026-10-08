// Deliberately refuses hosted endpoints before any fixture or database mutation.
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
require('./assert-isolated.cjs').assertIsolatedEnvironment();
const { createFixtures } = require('./flow-fixtures.cjs');
const { load } = require('./security-loader.cjs');
const { reviewState } = load('src/lib/operation-governance.ts');
const fixtures = createFixtures();
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let admin, baseline, browser;
async function getReview(client, topic = 'publicaciones') { const r = await client.from('operacion_revisiones').select('*').eq('tema', topic).single(); assert.ifError(r.error); return r.data; }
async function fingerprint(client, topic = 'publicaciones') { const r = await client.rpc('operation_public_fingerprint', { p_tema: topic }); assert.ifError(r.error); return r.data.huella; }
async function approve(client, row, hash, sources = 'a'.repeat(64)) { return client.rpc('operation_approve_review', { p_id: row.id, p_revision: row.revision, p_huella: hash, p_fuentes: sources }); }
async function main() {
  admin = await fixtures.account('admin');
  const aal1 = await admin.client.from('operacion_revisiones').select('id'); assert.ifError(aal1.error); assert.equal(aal1.data.length, 0);
  assert.ok((await admin.client.rpc('operation_public_fingerprint', { p_tema: 'publicaciones' })).error, 'AAL1 cannot calculate institutional approval evidence');
  await fixtures.enroll(admin);
  const staff = await fixtures.account('staff'); await fixtures.enroll(staff);
  const student = await fixtures.account('alumno', 97);
  const director = await fixtures.account('director'); await fixtures.enroll(director);
  baseline = await getReview(admin.client);
  assert.equal(baseline.estado, 'borrador', 'Use an untouched isolated proposal');
  assert.equal(baseline.folio_referencia, '', 'Refuse modifying an existing institutional review');
  const noAnon = await anon.from('operacion_revisiones').select('id'); assert.ok(noAnon.error || noAnon.data.length === 0);
  const noStudent = await student.client.from('operacion_revisiones').select('id'); assert.ifError(noStudent.error); assert.equal(noStudent.data.length, 0);
  const studentWrite = await student.client.from('operacion_revisiones').update({ area_responsable: 'Forbidden' }).eq('id', baseline.id).select('id'); assert.ok(studentWrite.error || studentWrite.data.length === 0);
  const forge = await staff.client.from('operacion_historial').insert({ revision_id: baseline.id, actor_id: staff.id, actor_rol: 'director', accion: 'aprobacion', version: 1, datos: {} }); assert.ok(forge.error);
  const tamper = await admin.client.from('operacion_revisiones').update({ huella_aprobada: 'b'.repeat(64) }).eq('id', baseline.id); assert.ok(tamper.error);
  const blank = await approve(admin.client, baseline, await fingerprint(admin.client)); assert.ok(blank.error, 'Incomplete proposals cannot be approved');
  const saved = await staff.client.from('operacion_revisiones').update({ folio_referencia: 'QA-ISOLATED', detalle: 'Procedimiento sintético de revisión utilizado sólo por la prueba aislada.', fecha_revision: today, proxima_revision: today, estado: 'borrador' }).eq('id', baseline.id).select('*').single(); assert.ifError(saved.error);
  assert.ok((await approve(staff.client, saved.data, await fingerprint(staff.client))).error, 'Staff cannot approve');
  assert.ok((await approve(admin.client, saved.data, 'b'.repeat(64))).error, 'Tampered public hash rejected');
  assert.ok((await approve(admin.client, { ...saved.data, revision: 1 }, await fingerprint(admin.client))).error, 'Outdated policy revision rejected');
  assert.ok((await approve(admin.client, saved.data, await fingerprint(admin.client), null)).error, 'Static policy fingerprint is required');
  const tomorrow = new Date(today + 'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const future = tomorrow.toISOString().slice(0, 10);
  const futureApproval = await admin.client.from('operacion_revisiones').update({ estado: 'aprobado', huella_solicitada: await fingerprint(admin.client), fuentes_solicitadas: 'a'.repeat(64), fecha_revision: future, proxima_revision: future }).eq('id', baseline.id); assert.ok(futureApproval.error, 'Cannot approve a review not yet performed');
  assert.ifError((await approve(director.client, saved.data, await fingerprint(director.client))).error);
  const approved = await getReview(admin.client), current = await fingerprint(admin.client);
  assert.equal(reviewState(approved, current, today, 'a'.repeat(64)).state, 'vigente');
  assert.equal(reviewState(approved, current, today, 'b'.repeat(64)).state, 'pendiente');
  const newsId = await fixtures.row('noticias', { titulo: 'Isolated governance fixture', slug: 'isolated-governance-' + require('node:crypto').randomUUID(), resumen: 'Synthetic public fixture', contenido: '<p>Synthetic content.</p>', publicada: true });
  const changed = await fingerprint(admin.client); assert.notEqual(changed, current);
  assert.equal(reviewState(approved, changed, today, 'a'.repeat(64)).state, 'pendiente');
  const news = await anon.from('noticias').select('id').eq('id', newsId); assert.ifError(news.error); assert.equal(news.data.length, 1, 'Obsolete review must not block public content');
  const history = await admin.client.from('operacion_historial').select('*').eq('revision_id', baseline.id); assert.ifError(history.error); assert.equal(history.data.length, 2); assert.ok(history.data.some(r => r.accion === 'aprobacion' && r.actor_rol === 'director'));
  assert.ok((await staff.client.from('operacion_historial').update({ accion: 'aprobacion' }).eq('revision_id', baseline.id)).error);
  console.log('PASS operation database: role/MFA gates, real approval, stale hash/version, future dates, history and public continuity.');
  if (process.argv.includes('--browser')) {
    const { chromium } = require('playwright'); const base = process.env.FLOW_BASE_URL;
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([...admin.cookies.values()].map(cookie => ({ name: cookie.name, value: cookie.value, url: base })));
    const page = await context.newPage(), errors = []; page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(180000); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/admin/operacion', { waitUntil: 'domcontentloaded' });
    const consent = page.getByRole('button', { name: /rechazar opcionales/i }); if (await consent.isVisible()) await consent.click();
    await page.getByRole('heading', { name: 'Operación institucional', exact: true }).waitFor();
    let section = page.locator('#publicaciones');
    for (let attempt = 0; attempt < 3; attempt++) {
      await section.locator('input[name="confirmacion"]').check();
      await Promise.all([page.waitForURL(/status=(aprobado|cambio)/), section.getByRole('button', { name: 'Aprobar ficha guardada con MFA' }).click()]);
      if (new URL(page.url()).searchParams.get('status') === 'aprobado') break;
      await page.goto(base + '/admin/operacion', { waitUntil: 'domcontentloaded' }); section = page.locator('#publicaciones');
    }
    assert.equal(new URL(page.url()).searchParams.get('status'), 'aprobado', 'Public content changed repeatedly during approval; retry after concurrent content tests');
    const guiApproved = await getReview(admin.client); assert.equal(guiApproved.estado, 'aprobado'); assert.match(guiApproved.fuentes_aprobadas, /^[0-9a-f]{64}$/);
    section = page.locator('#publicaciones'); await section.locator('input[name="area_responsable"]').fill('Dirección / Control Escolar');
    await Promise.all([page.waitForURL(/status=guardado/), section.getByRole('button', { name: 'Guardar borrador' }).click()]);
    assert.equal((await getReview(admin.client)).estado, 'borrador'); assert.equal(errors.length, 0, 'Operation GUI page errors');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile operation board overflows');
    console.log('PASS operation GUI390: actual approval action, draft action, source hash, no page errors/overflow.');
  }
  console.log('PASS isolated governance: MFA/RLS, staff draft, director approval, stale/tampered hash, protected history, public continuity.');
}
(async () => { try { await main(); } finally {
  if (browser) await browser.close();
  if (admin && baseline) {
    const keys = ['titulo','area_responsable','periodicidad_dias','ciclo_id','folio_referencia','referencia_url','detalle','fecha_revision','proxima_revision','objetivo_rpo_minutos','objetivo_rto_minutos'];
    const restored = await admin.client.from('operacion_revisiones').update({ ...Object.fromEntries(keys.map(k => [k, baseline[k]])), estado: 'borrador' }).eq('id', baseline.id); assert.ifError(restored.error);
    const removed = await fixtures.admin.from('operacion_historial').delete().eq('revision_id', baseline.id).gt('version', baseline.revision); assert.ifError(removed.error);
  }
  await fixtures.cleanup();
} })().catch(error => { console.error('FAIL isolated governance: ' + error.message); process.exitCode = 1; });
