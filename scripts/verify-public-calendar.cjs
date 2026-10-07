// Regression probes use synthetic dates and mocked writes: never alter school data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: name => {
    if (!(name in imports)) throw new Error('Unexpected import: ' + name);
    return imports[name];
  }, Date, Intl, URL }, { filename: file });
  return module.exports;
}
const calendar = load('src/lib/public-convocatorias.ts');
assert.equal(calendar.schoolToday(new Date('2026-10-07T02:00:00Z')), '2026-10-06');
assert.equal(calendar.schoolToday(new Date('2026-10-07T05:59:59Z')), '2026-10-06');
assert.equal(calendar.schoolToday(new Date('2026-10-07T06:00:00Z')), '2026-10-07');
for (const date of ['0000-10-06', '2026-02-29', '2026-04-31', 'not-a-date', '2026-2-3']) assert.equal(calendar.validCalendarDate(date), false);
assert.equal(calendar.validCalendarDate('2028-02-29'), true);
assert.equal(calendar.convocatoriaStatus('2026-10-06', '2026-10-06', '2026-10-06'), 'Vigente');
assert.equal(calendar.convocatoriaStatus(null, '2026-10-06', '2026-10-06'), 'Vigente');
assert.equal(calendar.convocatoriaStatus('2026-10-07', null, '2026-10-06'), 'Próxima');
assert.equal(calendar.convocatoriaStatus(null, '2026-10-05', '2026-10-06'), 'Concluida');
assert.equal(calendar.convocatoriaStatus('2026-10-07', '2026-10-06', '2026-10-06'), 'Fechas inválidas');
assert.ok(calendar.formatSchoolDate('2026-10-06').startsWith('6 de octubre'));

let authorized = true, guarded = 0, writes = 0, dbError = null;
const revalidated = [];
const redirect = location => { throw Object.assign(new Error('redirect'), { location }); };
const actions = load('src/app/admin/convocatorias/actions.ts', {
  '@/lib/security/access': { requireAccess: async () => { guarded++; if (!authorized) throw new Error('No autorizado'); } },
  '@/lib/security/form-data': { validateFormData: async () => {} },
  '@/lib/public-convocatorias': calendar,
  '@/lib/supabase/admin': { adminClient: () => ({ from: () => ({
    insert: async () => { writes++; return { error: dbError }; },
    delete: () => ({ eq: () => ({ select: async () => { writes++; return { data: dbError ? [] : [{ id: 'synthetic' }], error: dbError }; } }) }),
  }) }) },
  'next/cache': { revalidatePath: path => revalidated.push(path) },
  'next/navigation': { redirect },
});
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }
async function redirected(action, values, location) {
  await assert.rejects(action(form(values)), error => error.location === location);
}
(async () => {
  const valid = { titulo: 'Convocatoria sintética', vigente_desde: '2026-10-06', vigente_hasta: '2026-10-06', archivo_url: 'https://example.com/convocatoria.pdf' };
  authorized = false;
  await assert.rejects(actions.crearConvocatoria(form(valid)), /No autorizado/);
  assert.equal(writes, 0);
  authorized = true;
  await redirected(actions.crearConvocatoria, { ...valid, vigente_hasta: '2026-10-05' }, '/admin/convocatorias?error=fechas');
  await redirected(actions.crearConvocatoria, { ...valid, vigente_hasta: '2026-02-29' }, '/admin/convocatorias?error=fechas');
  await redirected(actions.crearConvocatoria, { ...valid, archivo_url: 'javascript:alert(1)' }, '/admin/convocatorias?error=archivo');
  await redirected(actions.crearConvocatoria, { ...valid, titulo: '' }, '/admin/convocatorias?error=titulo');
  assert.equal(writes, 0, 'Invalid values must not reach an insert');
  dbError = { message: 'synthetic failure' };
  await redirected(actions.crearConvocatoria, valid, '/admin/convocatorias?error=guardar');
  assert.equal(revalidated.length, 0, 'Failed save must not announce success');
  dbError = null;
  await redirected(actions.crearConvocatoria, valid, '/admin/convocatorias?resultado=creada');
  assert.deepEqual(revalidated, ['/admin/convocatorias', '/publico/convocatorias']);
  await redirected(actions.eliminarConvocatoria, { id: '' }, '/admin/convocatorias?error=eliminar');
  dbError = { message: 'synthetic failure' };
  await redirected(actions.eliminarConvocatoria, { id: 'synthetic' }, '/admin/convocatorias?error=eliminar');
  assert.equal(guarded, 9);
  console.log('PASS school calendar: Mexico midnight, inclusive final day, future/expired/invalid ranges; authorization before writes; clear save/delete errors; public invalidation. No live mutations.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
