// Browser smoke checks with isolated accounts. No trace, screenshots, passwords or cookies saved.
if (!process.argv.includes('--live')) throw Error('Requiere --live para crear fixtures temporales.');
require('./assert-isolated.cjs').assertIsolatedEnvironment();
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createFixtures, otp } = require('./flow-fixtures.cjs');
const f = createFixtures(), base = process.env.FLOW_BASE_URL || 'http://localhost:3002';
let browser, probePhase = 'setup';
async function login(fixture, target) {
  const context = await browser.newContext({ locale: 'es-MX' });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  probePhase = `login-${fixture.role}-document`;
  await page.goto(`${base}/login?redirect=${encodeURIComponent(target)}`);
  probePhase = `login-${fixture.role}-cookie-ready`;
  await page.locator('[data-cookie-ready="true"]').waitFor();
  const reject = page.getByRole('button', { name: /rechazar opcionales/i });
  probePhase = `login-${fixture.role}-cookie-banner`;
  await reject.waitFor({ state:'visible' });
  await reject.click();
  const userField = page.getByRole('textbox', { name: 'Correo institucional', exact: true });
  const loginForm = page.locator('form:visible').filter({ has: userField });
  await userField.fill(fixture.email);
  await loginForm.locator('input[name="password"]:visible').fill(fixture.password);
  await loginForm.getByRole('button', { name: /^Entrar/ }).click();
  if (['admin','finanzas'].includes(fixture.role)) {
    probePhase = `login-${fixture.role}-mfa-destination`;
    await page.waitForURL(/\/seguridad/);
    probePhase = `login-${fixture.role}-mfa-enroll`;
    await page.getByRole('button', { name: 'Configurar autenticador' }).click();
    probePhase = `login-${fixture.role}-mfa-secret-dom`;
    await page.locator('details code').waitFor({ state: 'attached' });
    const secret = await page.locator('details code').textContent();
    // Use a fresh TOTP window; never log or persist the seed or generated code.
    const remaining = 30000 - Date.now() % 30000;
    if (remaining < 8000) await new Promise(resolve => setTimeout(resolve, remaining + 100));
    await page.locator('input[name="code"]').fill(otp(secret));
    probePhase = `login-${fixture.role}-mfa-verify`;
    await page.getByRole('button', { name: 'Verificar y continuar' }).click();
  }
  probePhase = `login-${fixture.role}-requested-destination`;
  try {
    await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 180000 });
  } catch (error) {
    const pathname = new URL(page.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':fixture');
    const alerts = await page.getByRole('alert').allTextContents().catch(() => []);
    const categories = [...new Set(alerts.map(text => /incorrecto|vencido/i.test(text) ? 'code-rejected' : /intentos|minutos|demasiad/i.test(text) ? 'rate-limit' : /sesión|sesion|acceso/i.test(text) ? 'session-or-access' : 'other-generic-error'))];
    console.error(JSON.stringify({ phase: 'browser-login-destination', role: fixture.role, path: pathname, alertCategories: categories }));
    throw error;
  }
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
  probePhase = 'teacher-constancia';
  await teacherPage.getByRole('heading',{name:/Constancia de servicio/}).waitFor({state:'visible'});
  const pdf = await teacherPage.request.get(`${base}/api/constancia/${teacher.professorId}?ciclo_id=${cycle}`, { timeout: 90000 });
  assert.equal(pdf.status(),200); assert.ok((await pdf.body()).subarray(0,5).equals(Buffer.from('%PDF-')));
  const foreignPdf = await teacherPage.request.get(`${base}/api/constancia/${otherTeacher.professorId}?ciclo_id=${cycle}`);
  assert.equal(foreignPdf.status(),403);
  console.log('PASS browser own constancia PDF; foreign constancia denied.');
  await login(administrator, '/admin/profesores');
  const financePage = await login(finance, '/admin/pagos');
  probePhase = 'finance-home-profile';
  await financePage.goto(base+'/admin');
  await financePage.getByText('Panel financiero',{exact:true}).waitFor();
  await financePage.goto(base+'/admin/perfil');
  await financePage.getByRole('heading',{name:/Mi perfil/}).waitFor({state:'visible'});
  console.log('PASS finance home and profile remain accessible.');
  probePhase = 'teacher-avatar';
  await teacherPage.goto(base+'/profesor/perfil');
  // File selection dispatches change directly: wait for the profile client bundle first.
  await teacherPage.waitForLoadState('networkidle');
  const avatar = Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAXkAAAAASUVORK5CYII=','base64'),Buffer.alloc(1200000)]);
  const avatarEvents = [];
  const avatarStage = request => {
    const path = new URL(request.url()).pathname;
    return request.method() === 'POST' && path === '/api/uploads/prepare' ? 'prepare'
      : request.method() === 'PUT' && path.startsWith('/storage/v1/object/upload/sign/security-uploads/') ? 'signed-put'
      : request.method() === 'POST' && path === '/profesor/perfil' ? 'profile-action' : null;
  };
  const recordAvatarResponse = response => { const stage = avatarStage(response.request()); if (stage && avatarEvents.length < 20) avatarEvents.push({ stage, status: response.status() }); };
  const recordAvatarFailure = request => { const stage = avatarStage(request); if (stage && avatarEvents.length < 20) avatarEvents.push({ stage, failed: true }); };
  teacherPage.on('response', recordAvatarResponse); teacherPage.on('requestfailed', recordAvatarFailure);
  try {
    // A real chooser proves the component's onClick handler is hydrated; do not inject
    // a change directly into the hidden input before React has attached its handlers.
    const chosen = teacherPage.waitForEvent('filechooser');
    await teacherPage.getByRole('button', { name: /Subir foto/ }).click();
    await (await chosen).setFiles({name:'fixture.png',mimeType:'image/png',buffer:avatar});
    await teacherPage.getByText('✅ Foto actualizada',{exact:true}).waitFor();
  } catch (error) {
    const messages = await teacherPage.getByText(/^⚠️/).allTextContents().catch(() => []);
    const categories = [...new Set(messages.map(text => /origen/i.test(text) ? 'origin' : /sesión|sesion|acceso/i.test(text) ? 'access' : /tamaño|grande|MB/i.test(text) ? 'size' : 'generic-upload-error'))];
    const persisted = await f.admin.from('perfiles').select('avatar_url').eq('id',teacher.id).maybeSingle();
    console.error(JSON.stringify({ phase: 'avatar-upload', events: avatarEvents, errorCategories: categories, avatarPersisted: !!persisted.data?.avatar_url }));
    throw error;
  } finally { teacherPage.off('response', recordAvatarResponse); teacherPage.off('requestfailed', recordAvatarFailure); }
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
  probePhase = 'student-exam';
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
  probePhase = 'teacher-exam-grading';
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
  probePhase = 'teacher-forced-password';
  const forcePassword = await f.admin.from('perfiles').update({debe_cambiar_password:true}).eq('id',teacher.id);
  assert.ifError(forcePassword.error);
  const forcedRedirect = await teacherPage.request.get(base+'/profesor', { maxRedirects:0, timeout:60000 });
  assert.equal(forcedRedirect.status(),307,'Forced password must redirect before rendering teacher panel');
  assert.equal(new URL(forcedRedirect.headers().location,base).pathname,'/cambiar-password');
  const passwordNavigation = [], passwordInflight = new Map();
  const recordPasswordRequest = request => passwordInflight.set(request,request.resourceType());
  const finishPasswordRequest = request => passwordInflight.delete(request);
  const recordPasswordResponse = response => {
    const request = response.request(), path = new URL(response.url()).pathname;
    if (request.isNavigationRequest() && ['/profesor','/cambiar-password'].includes(path)) passwordNavigation.push({path,status:response.status()});
  };
  teacherPage.on('request',recordPasswordRequest); teacherPage.on('requestfinished',finishPasswordRequest); teacherPage.on('requestfailed',finishPasswordRequest); teacherPage.on('response',recordPasswordResponse);
  try {
    await teacherPage.goto(base+'/profesor', {waitUntil:'domcontentloaded',timeout:60000});
    await teacherPage.waitForURL(base+'/cambiar-password',{waitUntil:'domcontentloaded',timeout:60000});
    await teacherPage.locator('input[name="nueva"]').waitFor();
  } catch (error) {
    console.error(JSON.stringify({phase:'forced-password-navigation',path:new URL(teacherPage.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,':fixture'),navigation:passwordNavigation,inflightTypes:[...new Set(passwordInflight.values())]}));
    throw error;
  } finally {
    teacherPage.off('request',recordPasswordRequest); teacherPage.off('requestfinished',finishPasswordRequest); teacherPage.off('requestfailed',finishPasswordRequest); teacherPage.off('response',recordPasswordResponse);
  }
  const newPassword = crypto.randomBytes(24).toString('base64url');
  await teacherPage.locator('input[name="nueva"]').fill(newPassword);
  await teacherPage.locator('input[name="confirma"]').fill(newPassword);
  await teacherPage.locator('button[type="submit"]').first().click();
  await teacherPage.waitForURL(base+'/profesor');
  const flag = await f.admin.from('perfiles').select('debe_cambiar_password').eq('id',teacher.id).single();
  assert.equal(flag.data.debe_cambiar_password,false);
  console.log('PASS browser forced password change → refreshed session → teacher panel.');
} finally { if(browser) await browser.close(); await f.cleanup(); } }
main().catch(error=>{ const frame=String(error.stack||'').match(/verify-browser-flows\.cjs:(\d+):(\d+)/); console.error(JSON.stringify({phase:probePhase,probeLine:frame?Number(frame[1]):null})); console.error(error.message.split('\n')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,':fixture')); process.exitCode=1; });
