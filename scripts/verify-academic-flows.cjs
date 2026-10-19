// Run only with --live. Creates isolated cohorts; never modifies existing school rows.
if (!process.argv.includes('--live')) throw Error('Requiere --live para crear fixtures temporales.');
require('./assert-isolated.cjs').assertIsolatedEnvironment();
const assert = require('node:assert/strict');
const { createFixtures } = require('./flow-fixtures.cjs');
const { load } = require('./security-loader.cjs');
const f = createFixtures();
let actor;
function actions(file) {
  return load(file, {
    '@/lib/supabase/server': { createClient: async () => actor.client },
    '@/lib/supabase/admin': { adminClient: () => f.admin },
    'next/headers': { headers: async () => new Headers() },
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: url => { throw Error(`Redirect: ${url}`); } },
  }, process.env);
}
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, String(value)); return data; }
async function checked(result, name) { assert.ok(!result.error, `${name}: ${result.error?.code ?? result.error}`); return result.data; }
async function page(fixture, path, expected) {
  const base = process.env.FLOW_BASE_URL || 'http://localhost:3001';
  const cookie = [...fixture.cookies.values()].map(c => `${c.name}=${c.value}`).join('; ');
  const response = await fetch(base + path, { headers: { cookie }, redirect: 'manual' });
  const html = await response.text();
  assert.equal(response.status, 200, `Page ${path}: ${response.status}`);
  assert.ok(html.includes(expected), `Page ${path} missing expected content`);
  assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'), `Page ${path} errored`);
  console.log(`PASS page ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':fixture')}`);
}
async function main() { try {
  const student = await f.account('alumno', 93), outsider = await f.account('alumno', 94);
  const teacher = await f.account('profesor'), counselor = await f.account('profesor');
  const administrator = await f.account('admin'), finance = await f.account('finanzas');
  await f.enroll(administrator); await f.enroll(finance);
  const cycle = await f.row('ciclos_escolares', { codigo: `FLOW-${Date.now()}`, periodo: 'Verification', activo: false });
  const group = await f.row('grupos', { ciclo_id: cycle, grado: 1, semestre: 1, grupo: 1, turno: 'matutino', orientador_id: counselor.professorId });
  const subject = await f.row('materias', { nombre: 'Flow fixture subject', clave: `FLOW-${Date.now()}`, semestre: 1, tipo: 'obligatoria', activo: false });
  const assignment = await f.row('asignaciones', { ciclo_id: cycle, grupo_id: group, materia_id: subject, profesor_id: teacher.professorId });
  await f.row('inscripciones', { alumno_id: student.studentId, grupo_id: group, ciclo_id: cycle, estatus: 'activa' });
  const forbidden = await teacher.client.from('profesores').select('rfc').eq('id', teacher.professorId);
  assert.equal(forbidden.error?.code, '42501');
  const publicTeacher = await teacher.client.from('profesores').select('id,nombre').eq('id', teacher.professorId);
  await checked(publicTeacher, 'public teacher fields'); assert.equal(publicTeacher.data.length, 1);
  console.log('PASS restricted RFC stays unavailable to direct clients; public fields readable.');
  if (!process.argv.includes('--data-only')) {
    await page(teacher, '/profesor/constancia', 'Constancia de servicio');
    await page(administrator, '/admin/profesores', 'Flow');
    await page(finance, '/admin/pagos', 'Pagos');
  }
  actor = teacher;
  const taskActions = actions('src/app/profesor/tareas/actions.ts');
  const task = await taskActions.crearTarea(form({ asignacion_id: assignment, titulo: 'Flow task fixture', instrucciones: 'Synthetic verification instructions', fecha_entrega: new Date(Date.now() + 3600000).toISOString(), permite_archivos: 'on', puntos: 10 }));
  assert.ok(task.id, `create task: ${task.error}`);
  f.cleanups.push(async () => {
    const files = await f.admin.storage.from('tareas').list(task.id);
    if (files.data?.length) await f.admin.storage.from('tareas').remove(files.data.map(file=>`${task.id}/${file.name}`));
    await checked(await f.admin.from('entregas_tarea').delete().eq('tarea_id', task.id), 'cleanup deliveries');
    await checked(await f.admin.from('tareas').delete().eq('id', task.id), 'cleanup task');
  });
  actor = student;
  const deliveryActions = actions('src/app/alumno/tareas/actions.ts');
  const taskForm = form({ tarea_id: task.id, comentario: 'Synthetic answer' });
  taskForm.set('archivo', new File(['%PDF-1.4\nSynthetic fixture'], 'fixture.pdf', { type:'application/pdf' }));
  const delivered = await deliveryActions.entregarTarea(taskForm); assert.ok(delivered.ok, delivered.error);
  const attachment = await checked(await f.admin.from('entregas_tarea').select('archivo_url').eq('tarea_id',task.id).single(),'attachment');
  assert.ok(!(await student.client.storage.from('tareas').createSignedUrl(attachment.archivo_url,60)).error,'Own attachment denied');
  assert.ok((await outsider.client.storage.from('tareas').createSignedUrl(attachment.archivo_url,60)).error,'Foreign attachment allowed');
  assert.ok(!(await teacher.client.storage.from('tareas').createSignedUrl(attachment.archivo_url,60)).error,'Teacher attachment denied');
  actor = outsider;
  await assert.rejects(() => deliveryActions.entregarTarea(form({ tarea_id: task.id, comentario: 'Forbidden' })));
  actor = teacher;
  const delivery = await checked(await f.admin.from('entregas_tarea').select('id').eq('tarea_id', task.id).single(), 'delivery');
  const grade = await taskActions.calificarEntrega(form({ id: delivery.id, calificacion: 8 })); assert.ok(grade.ok, grade.error);
  const invalidGrade = await taskActions.calificarEntrega(form({ id: delivery.id, calificacion: 11 })); assert.ok(invalidGrade.error);
  actor = student;
  const resubmit = await deliveryActions.entregarTarea(form({ tarea_id:task.id, comentario:'Change graded delivery' })); assert.ok(resubmit.error);
  actor = teacher;
  console.log('PASS task create → student delivery → teacher grading; outsider denied.');
  const examActions = actions('src/app/profesor/examenes/actions.ts');
  const exam = await examActions.crearExamen(form({ asignacion_id: assignment, titulo: 'Flow exam fixture', fecha_cierre: new Date(Date.now() + 3600000).toISOString(), duracion_min: 30, intentos_max: 1, mostrar_resultados: 'on' })); assert.ok(exam.id, exam.error);
  f.cleanups.push(async () => {
    const attempts = await checked(await f.admin.from('examen_intentos').select('id').eq('examen_id', exam.id), 'cleanup attempt ids');
    if (attempts.length) await checked(await f.admin.from('examen_respuestas').delete().in('intento_id', attempts.map(a => a.id)), 'cleanup answers');
    await checked(await f.admin.from('examen_intentos').delete().eq('examen_id', exam.id), 'cleanup attempts');
    await checked(await f.admin.from('examen_preguntas').delete().eq('examen_id', exam.id), 'cleanup questions');
    await checked(await f.admin.from('examenes').delete().eq('id', exam.id), 'cleanup exam');
  });
  const add = await examActions.agregarPregunta(form({ examen_id: exam.id, tipo: 'verdadero_falso', enunciado: 'Synthetic true question', puntos: 1, orden: 1, respuesta_correcta: 'verdadero' })); assert.ok(add.ok, add.error);
  const question = await checked(await f.admin.from('examen_preguntas').select('id').eq('examen_id', exam.id).single(), 'question');
  actor = student;
  const studentExam = actions('src/app/alumno/examenes/actions.ts');
  // Exercise native handlers over the same disposable students/exam already created above.
  async function nativeExam(account,body) {
    const token=(await account.client.auth.getSession()).data.session.access_token;
    const api=actions('src/app/api/mobile/exams/route.ts');
    const request=new Request('http://localhost:3004/api/mobile/exams'+(body?'':'?exam_id='+exam.id),{
      method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      ...(body?{body:JSON.stringify(body)}:{})});
    return api[request.method](request);
  }
  const preview=await nativeExam(student);assert.equal(preview.status,200);
  const previewBody=await preview.json();assert.equal(previewBody.attempt,null);assert.deepEqual(previewBody.questions,[]);
  assert.equal((await nativeExam(outsider)).status,404);assert.equal((await nativeExam(teacher)).status,403);
  const [start, concurrent] = await Promise.all([studentExam.iniciarIntento(exam.id),studentExam.iniciarIntento(exam.id)]); assert.ok(start.id, start.error); assert.equal(start.id,concurrent.id);
  const nativeStarts=await Promise.all([nativeExam(student,{action:'start',exam_id:exam.id}),nativeExam(student,{action:'start',exam_id:exam.id})]);
  const nativeStart=await nativeStarts[0].json(),nativeAgain=await nativeStarts[1].json();
  assert.equal(nativeStarts[0].status,200);assert.equal(nativeStarts[1].status,200);assert.equal(nativeStart.attempt.id,start.id);assert.equal(nativeAgain.attempt.id,start.id);
  for(const field of ['respuesta_correcta','correcta','puntos_obtenidos'])assert.ok(!JSON.stringify(nativeStart).includes('"'+field+'"'));
  assert.equal((await nativeExam(outsider,{action:'save',attempt_id:start.id,answers:{[question.id]:'verdadero'}})).status,404);
  assert.equal((await nativeExam(student,{action:'save',attempt_id:start.id,answers:{'00000000-0000-4000-8000-000000000000':'verdadero'}})).status,409);
  assert.equal((await nativeExam(student,{action:'save',attempt_id:start.id,answers:{[question.id]:'invalid'}})).status,409);
  assert.equal((await nativeExam(student,{action:'save',attempt_id:start.id,answers:{[question.id]:'verdadero'},p_actor_id:outsider.id})).status,200);
  const saved = await studentExam.guardarRespuesta(form({ intento_id: start.id, pregunta_id: question.id, respuesta: 'verdadero' })); assert.ok(saved.ok, saved.error);
  await checked(await f.admin.from('examen_intentos').update({inicio:new Date(Date.now()-35*60000).toISOString()}).eq('id',start.id),'expire fixture');
  await assert.rejects(()=>studentExam.guardarRespuesta(form({intento_id:start.id,pregunta_id:question.id,respuesta:'falso'})));
  assert.equal((await nativeExam(student,{action:'save',attempt_id:start.id,answers:{[question.id]:'falso'}})).status,409);
  assert.equal((await nativeExam(student,{action:'submit',attempt_id:start.id,answers:{[question.id]:'falso'}})).status,200);
  const sent = await studentExam.entregarIntento(start.id,{[question.id]:'falso'}); assert.ok(sent.ok, sent.error);
  assert.ok((await studentExam.entregarIntento(start.id)).ok,'Repeated delivery failed');
  const result = await checked(await f.admin.from('examen_intentos').select('estado,calificacion').eq('id', start.id).single(), 'exam result');
  assert.equal(result.estado, 'calificado'); assert.equal(Number(result.calificacion), 10);
  const key = await student.client.from('examen_preguntas').select('respuesta_correcta').eq('id', question.id); assert.equal(key.error?.code, '42501');
  assert.equal((await nativeExam(student,{action:'submit',attempt_id:start.id,answers:{[question.id]:'falso'}})).status,200);
  assert.equal((await nativeExam(student,{action:'save',attempt_id:start.id,answers:{[question.id]:'falso'}})).status,409);
  await checked(await f.admin.from('examenes').update({mostrar_resultados:false}).eq('id',exam.id),'hide results');
  const hidden=await(await nativeExam(student)).json();assert.equal(hidden.attempt.calificacion,null);
  await checked(await f.admin.from('examenes').update({mostrar_resultados:true}).eq('id',exam.id),'publish results');
  assert.equal((await(await nativeExam(student)).json()).attempt.calificacion,10);
  // Closed-cycle guard is shared with web RPCs. Always reopen our own cycle before existing cleanup.
  try {
    await checked(await f.admin.from('ciclos_escolares').update({cerrado_en:new Date().toISOString()}).eq('id',cycle),'close own fixture cycle');
    assert.equal((await nativeExam(student,{action:'start',exam_id:exam.id})).status,409);
    const closed=await studentExam.guardarRespuesta(form({intento_id:start.id,pregunta_id:question.id,respuesta:'verdadero'})).catch(()=>({error:'denied'}));assert.ok(closed.error);
    const edit=await f.admin.from('examen_preguntas').update({enunciado:'Closed own edit'}).eq('id',question.id);assert.ok(edit.error);
  } finally {await checked(await f.admin.from('ciclos_escolares').update({cerrado_en:null}).eq('id',cycle),'reopen own fixture cycle');}
  console.log('PASS native exam handler contracts over existing academic fixtures: preview/start/save/submit/expiry, foreign actors, hidden keys/results, shared cycle guard.');
  console.log('PASS exam create → answer → submit → grade=10; answer key denied.');
} finally { await f.cleanup(); } }
main().catch(error => { console.error(error.message); process.exitCode = 1; });
