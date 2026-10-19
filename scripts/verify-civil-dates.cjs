const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { spawnSync } = require('node:child_process');
const { load } = require('./security-loader.cjs');

if (!process.argv.includes('--tz-worker')) {
  for (const TZ of ['UTC', 'America/Mexico_City', 'Pacific/Honolulu', 'Asia/Tokyo']) {
    const result = spawnSync(process.execPath, [__filename, '--tz-worker'], {
      cwd: path.resolve(__dirname, '..'), env: { ...process.env, TZ }, encoding: 'utf8', timeout: 20000,
    });
    assert.equal(result.status, 0, `Civil dates failed under ${TZ}: ${result.stderr || result.error || result.stdout}`);
  }
  console.log('PASS civil dates: strict SQL DATE/leap validation, 2008-03-15, four process timezones, ten real page expressions, unchanged payment literal. No network or fixtures.');
} else {
  const { formatCivilDate } = load('src/lib/civil-date.ts');
  assert.equal(formatCivilDate('2008-03-15'), '15 de marzo de 2008');
  assert.equal(formatCivilDate('2028-02-29'), '29 de febrero de 2028');
  assert.equal(formatCivilDate('2000-02-29'), '29 de febrero de 2000');
  assert.equal(formatCivilDate('0001-01-01'), '01 de enero de 1');
  for (const value of ['1900-02-29', '2026-02-29', '2026-04-31', '0000-01-01', '2026-13-01', '2026-00-10', '2026-01-00', '2026-1-03', ' 2008-03-15', '2008-03-15 ', '2008-03-15T00:00:00Z', '', null, undefined, 20080315]) {
    assert.equal(formatCivilDate(value), 'Fecha inválida', `Must not normalize malformed date: ${String(value)}`);
  }
  // Runtime callers cannot override the invariant, even outside TypeScript's date-only options.
  assert.equal(formatCivilDate('2008-03-15', { day: 'numeric', timeZone: 'Pacific/Honolulu' }), '15');
  assert.equal(new Date('2008-03-15').toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric' }), '14', 'Reproduce old civil-date shift');

  const pages = [
    ['src/app/admin/page.tsx', 2],
    ['src/app/director/page.tsx', 2],
    ['src/app/admin/alumnos/[id]/historial/page.tsx', 1],
    ['src/app/publico/albumes/page.tsx', 1],
    ['src/app/publico/albumes/[slug]/page.tsx', 1],
    ['src/app/admin/publico/albumes/page.tsx', 1],
    ['src/app/publico/page.tsx', 1],
    ['src/app/profesor/grupo/[asignacionId]/bitacora/page.tsx', 1],
  ];
  for (const [file, expectedCount] of pages) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const calls = [];
    const visit = node => {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'formatCivilDate') calls.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.equal(calls.length, expectedCount, `${file}: each confirmed civil-date presentation must use the helper`);
    assert.ok(ast.statements.some(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@/lib/civil-date'), file);
    for (const call of calls) {
      const values = { fecha_inicio: '2008-03-15', fecha_fin: '2008-03-15', fecha_inscripcion: '2008-03-15', fecha_evento: '2008-03-15', fecha: '2008-03-15' };
      const context = { formatCivilDate, cicloActivo: values, ciclo: values, i: values, a: values, album: values, r: values };
      const expression = call.getText(ast);
      const actual = vm.runInNewContext(expression, context);
      const options = vm.runInNewContext('(' + call.arguments[1].getText(ast) + ')');
      const expected = new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(new Date('2008-03-15T12:00:00Z'));
      assert.equal(actual, expected, `${file}: actual rendered expression must preserve the civil day and its existing date fields`);
      assert.match(actual, /15/, `${file}: no previous-day output`);
    }
  }
  const admin = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
  const payment = admin.match(/key: 'fecha', label: 'Fecha', hideOn: 'mobile', render: \(p: any\) => ([^}]+) }/);
  assert.ok(payment, 'Payment cell exists');
  for (const [value, expected] of [['2008-03-15', '2008-03-15'], [null, '—'], ['', '—']]) {
    assert.equal(vm.runInNewContext('(' + payment[1] + ')', { p: { fecha_pago: value } }), expected);
  }
}
