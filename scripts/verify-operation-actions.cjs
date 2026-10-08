const assert = require('node:assert/strict');
const { load } = require('./security-loader.cjs');
const env = { EPO_NOTICE_DIGEST: 'a'.repeat(64) }, id = 'd424dd44-c84f-4cc8-b572-21353ac52f9b';
const sources = load('src/lib/operation-public-sources.ts', {}, env).publicPolicyFingerprint();
let access, updates = [], rpc = [], filters = [];
const query = {
  select() { return this; }, eq(key, value) { filters.push([key, value]); return this; },
  async single() { return { data: { id, tema: 'privacidad' }, error: null }; },
  update(value) { updates.push(value); return this; },
};
const client = { from(table) { assert.equal(table, 'operacion_revisiones'); return query; }, async rpc(name, values) { rpc.push([name, values]); return { error: null }; } };
const actions = load('src/app/admin/operacion/actions.ts', {
  'next/navigation': { redirect(path) { throw Error('redirect:' + path); } },
  'next/cache': { revalidatePath() {} },
  '@/lib/security/access': { async requireAccess(roles, operation) { access = { roles, operation }; return { client }; } },
  '@/lib/security/form-data': { async validateFormData() {} },
}, env);
function draft() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ id, revision: '3', titulo: 'Revisión', area_responsable: 'Dirección', periodicidad_dias: '90', folio_referencia: '', referencia_url: '', detalle: '', fecha_revision: '', proxima_revision: '' })) data.set(key, value);
  return data;
}
(async () => {
  const invalid = draft(); invalid.set('fecha_revision', '2026-02-30');
  await assert.rejects(actions.guardarRevision(invalid), /status=invalido/); assert.equal(updates.length, 0);
  await assert.rejects(actions.guardarRevision(draft()), /status=guardado/);
  assert.deepEqual([...access.roles], ['admin', 'staff', 'director']);
  assert.equal(updates[0].estado, 'borrador'); assert.equal(updates[0].fecha_revision, null);
  assert.ok(filters.some(([key, value]) => key === 'revision' && value === 3), 'Save uses optimistic revision');
  const approval = new FormData(); for (const [key, value] of Object.entries({ id, revision: '3', huella: 'b'.repeat(64), confirmacion: 'on', fuentes: 'forged' })) approval.set(key, value);
  await assert.rejects(actions.aprobarRevision(approval), /status=cambio/); assert.equal(rpc.length, 0);
  approval.set('fuentes', sources); await assert.rejects(actions.aprobarRevision(approval), /status=aprobado/);
  assert.deepEqual([...access.roles], ['admin', 'director']);
  assert.equal(rpc[0][0], 'operation_approve_review'); assert.equal(rpc[0][1].p_fuentes, sources);
  console.log('PASS operation actions: validation, optimistic draft, approval role gate and server-generated source hash.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
