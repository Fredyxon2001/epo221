// Browser smoke checks with isolated accounts. No trace, screenshots, passwords or cookies saved.
if (!process.argv.includes('--live')) throw Error('Requiere --live para crear fixtures temporales.');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtures, otp } = require('./flow-fixtures.cjs');
const f = createFixtures(), base = process.env.FLOW_BASE_URL || 'http://localhost:3002';
let browser;
async function login(fixture, target) {
  const context = await browser.newContext({ locale: 'es-MX' });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  await page.goto(`${base}/login?redirect=${encodeURIComponent(target)}`);
  const reject = page.getByRole('button', { name: /rechazar opcionales/i });
  await reject.waitFor({ state:'visible' });
  await reject.click();
  await page.locator('input[name="curp"]').fill(fixture.email);
  await page.locator('input[name="password"]').fill(fixture.password);
  await page.locator('button[type="submit"]').first().click();
  if (['admin','finanzas'].includes(fixture.role)) {
    await page.waitForURL(/\/seguridad/);
    await page.getByRole('button', { name: 'Configurar autenticador' }).click();
    await page.locator('details code').waitFor({ state: 'attached' });
    const secret = await page.locator('details code').textContent();
    await page.locator('input[name="code"]').fill(otp(secret));
    await page.getByRole('button', { name: 'Verificar y continuar' }).click();
  }
  await page.waitForURL(base + target);
  console.log(`PASS browser login ${fixture.role}${['admin','finanzas'].includes(fixture.role) ? ' → TOTP MFA → requested page' : ' → requested page'}`);
  return page;
}
async function main() { try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const teacher = await f.account('profesor'), otherTeacher = await f.account('profesor');
  const student = await f.account('alumno',95), administrator = await f.account('admin'), finance = await f.account('finanzas');
  const cycle = await f.row('ciclos_escolares', { codigo: `FLOW-UI-${Date.now()}`, periodo: 'Verification', activo: false });
  const group = await f.row('grupos', { ciclo_id: cycle, grado: 1, semestre: 1, grupo: 1, turno: 'matutino' });
  const subject = await f.row('materias', { nombre: 'Browser fixture subject', clave: `FLOW-UI-${Date.now()}`, semestre: 1, tipo: 'obligatoria', activo: false });
  const assignment = await f.row('asignaciones', { ciclo_id: cycle, grupo_id: group, materia_id: subject, profesor_id: teacher.professorId });
  await f.row('inscripciones', { alumno_id: student.studentId, grupo_id: group, ciclo_id: cycle, estatus: 'activa' });
  const teacherPage = await login(teacher, '/profesor/constancia');
  assert.ok((await teacherPage.locator('body').textContent()).includes('Constancia de servicio'));
  const pdf = await teacherPage.request.get(`${base}/api/constancia/${teacher.professorId}?ciclo_id=${cycle}`);
  assert.equal(pdf.status(),200); assert.ok((await pdf.body()).subarray(0,5).equals(Buffer.from('%PDF-')));
  const foreignPdf = await teacherPage.request.get(`${base}/api/constancia/${otherTeacher.professorId}?ciclo_id=${cycle}`);
  assert.equal(foreignPdf.status(),403);
  console.log('PASS browser own constancia PDF; foreign constancia denied.');
  await login(administrator, '/admin/profesores');
  const financePage = await login(finance, '/admin/pagos');
  await financePage.goto(base+'/admin');
  await financePage.getByText('Panel financiero',{exact:true}).waitFor();
  await financePage.goto(base+'/admin/perfil');
  assert.ok((await financePage.locator('body').textContent()).includes('Mi perfil'));
  console.log('PASS finance home and profile remain accessible.');
  await teacherPage.goto(base+'/profesor/perfil');
  const avatar = Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAXkAAAAASUVORK5CYII=','base64'),Buffer.alloc(1200000)]);
  await teacherPage.locator('input[type="file"]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:avatar});
  await teacherPage.getByText('✅ Foto actualizada',{exact:true}).waitFor();
  assert.ok((await f.admin.from('perfiles').select('avatar_url').eq('id',teacher.id).single()).data.avatar_url);
  console.log('PASS browser >1 MB upload → private staging → server validation → saved avatar.');
  const exam = await f.row('examenes', { asignacion_id: assignment, titulo:'Browser synthetic exam', fecha_cierre: new Date(Date.now()+3600000).toISOString(), duracion_min:30, intentos_max:1, aleatorizar:true, creado_por:teacher.id });
  const question = await f.row('examen_preguntas', { examen_id:exam, tipo:'verdadero_falso', enunciado:'Browser synthetic true question', puntos:1, opciones:[{clave:'verdadero',texto:'Verdadero'},{clave:'falso',texto:'Falso'}], respuesta_correcta:'verdadero', orden:1 });
  const open1 = await f.row('examen_preguntas', { examen_id:exam, tipo:'abierta', enunciado:'Browser synthetic open one', puntos:1, orden:2 });
  const open2 = await f.row('examen_preguntas', { examen_id:exam, tipo:'abierta', enunciado:'Browser synthetic open two', puntos:1, orden:3 });
  f.cleanups.push(async () => {
    const attempts = await f.admin.from('examen_intentos').select('id').eq('examen_id',exam);
    if (attempts.data?.length) await f.admin.from('examen_respuestas').delete().in('intento_id',attempts.data.map(a=>a.id));
    await f.admin.from('examen_intentos').delete().eq('examen_id',exam);
  });
  const studentPage = await login(student, `/alumno/examenes/${exam}`);
  const attempt = await f.admin.from('examen_intentos').select('id').eq('examen_id',exam).single(); assert.ok(attempt.data);
  await f.admin.from('examen_intentos').update({ inicio:new Date(Date.now()-5*60000).toISOString() }).eq('id',attempt.data.id);
  const order = await studentPage.locator('fieldset').evaluateAll(nodes => nodes.map(n=>n.parentElement.textContent.split('pts')[0]));
  await studentPage.reload();
  assert.deepEqual(await studentPage.locator('fieldset').evaluateAll(nodes => nodes.map(n=>n.parentElement.textContent.split('pts')[0])),order);
  assert.ok(/24:|25:00/.test(await studentPage.locator('.sticky.font-mono').textContent()),'Attempt timer restarted');
  await studentPage.locator(`input[name="p-${question}"][value="verdadero"]`).check();
  const openFields = studentPage.locator('textarea');
  await openFields.nth(0).fill('Synthetic browser response one');
  await openFields.nth(1).fill('Synthetic browser response two');
  studentPage.on('dialog',dialog=>dialog.accept());
  await studentPage.getByRole('button',{name:'Entregar examen',exact:true}).click();
  await studentPage.waitForURL(base+'/alumno/examenes');
  let state = await f.admin.from('examen_intentos').select('estado,calificacion').eq('id',attempt.data.id).single();
  assert.equal(state.data.estado,'enviado'); assert.equal(state.data.calificacion,null);
  const answers = await f.admin.from('examen_respuestas').select('id,pregunta_id,respuesta').eq('intento_id',attempt.data.id);
  assert.equal(answers.data.length,3); assert.ok(answers.data.filter(r=>[open1,open2].includes(r.pregunta_id)).every(r=>r.respuesta));
  await teacherPage.goto(`${base}/profesor/examenes/${exam}`);
  for (let index=0;index<2;index++) {
    const gradeForm = teacherPage.locator('form').filter({has:teacherPage.locator('input[name="puntos_obtenidos"]')}).first();
    await gradeForm.locator('input[name="puntos_obtenidos"]').fill('1');
    const response = teacherPage.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/profesor/examenes/'));
    await gradeForm.getByRole('button',{name:'Guardar',exact:true}).click(); await response;
    await teacherPage.reload();
    state = await f.admin.from('examen_intentos').select('estado,calificacion').eq('id',attempt.data.id).single();
    assert.equal(state.data.estado,index===0?'enviado':'calificado');
    assert.equal(state.data.calificacion,index===0?null:10);
  }
  console.log('PASS browser exam resume/order/timer → autosave and unblurred draft → submit → all manual answers graded → final 10.');
  await f.admin.from('perfiles').update({debe_cambiar_password:true}).eq('id',teacher.id);
  await teacherPage.goto(base+'/profesor'); await teacherPage.waitForURL(/\/cambiar-password/);
  const newPassword = crypto.randomBytes(24).toString('base64url');
  await teacherPage.locator('input[name="nueva"]').fill(newPassword);
  await teacherPage.locator('input[name="confirma"]').fill(newPassword);
  await teacherPage.locator('button[type="submit"]').first().click();
  await teacherPage.waitForURL(base+'/profesor');
  const flag = await f.admin.from('perfiles').select('debe_cambiar_password').eq('id',teacher.id).single();
  assert.equal(flag.data.debe_cambiar_password,false);
  console.log('PASS browser forced password change → refreshed session → teacher panel.');
} finally { if(browser) await browser.close(); await f.cleanup(); } }
main().catch(error=>{ console.error(error.message.split('\n')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,':fixture')); process.exitCode=1; });
