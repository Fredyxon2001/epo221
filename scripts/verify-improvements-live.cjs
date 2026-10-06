if(!process.argv.includes('--live'))throw Error('Requiere --live; solo cuentas y grupos temporales.');
const assert=require('node:assert/strict');
const {createFixtures}=require('./flow-fixtures.cjs');
const {load}=require('./security-loader.cjs');
const {createClient}=require('@supabase/supabase-js');
const f=createFixtures(),base=process.env.FLOW_BASE_URL??'http://localhost:3002';
let cycle,administrator;
async function checked(p,label){const r=await p;assert.ok(!r.error,label+': '+(r.error?.message??''));return r.data;}
async function mobile(account,path,method='GET',body){
  const {data:{session}}=await account.client.auth.getSession();
  const response=await fetch(base+'/api/mobile/'+path,{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {response,data:await response.json()};
}
async function main(){try{
  const pupil=await f.account('alumno',82),other=await f.account('alumno',83),teacher=await f.account('profesor'),counselor=await f.account('profesor');
  administrator=await f.account('admin');await f.enroll(administrator);
  cycle=await f.row('ciclos_escolares',{codigo:'FLOW-IMPROVEMENTS-'+Date.now(),periodo:'Verification',activo:false,fecha_inicio:'2020-01-01',fecha_fin:'2020-12-31'});
  const group=await f.row('grupos',{ciclo_id:cycle,grado:1,semestre:1,grupo:1,turno:'matutino',orientador_id:counselor.professorId});
  const foreign=await f.row('grupos',{ciclo_id:cycle,grado:1,semestre:1,grupo:2,turno:'matutino'});
  await f.row('inscripciones',{alumno_id:pupil.studentId,grupo_id:group,ciclo_id:cycle,estatus:'activa'});
  await f.row('inscripciones',{alumno_id:other.studentId,grupo_id:foreign,ciclo_id:cycle,estatus:'activa'});
  const assignments=[],grades=[];
  for(let i=0;i<3;i++){
    const subject=await f.row('materias',{nombre:'Synthetic follow-up subject '+i,clave:'FLOW-IMP-'+Date.now()+'-'+i,semestre:1,tipo:'obligatoria',activo:false});
    const assignment=await f.row('asignaciones',{ciclo_id:cycle,grupo_id:group,materia_id:subject,profesor_id:teacher.professorId});assignments.push(assignment);
    await f.row('tareas',{asignacion_id:assignment,titulo:'Synthetic due task '+i,instrucciones:"Synthetic verification instructions",parcial:1,puntos:10,fecha_apertura:'2020-01-01T00:00:00Z',fecha_entrega:'2020-01-02T00:00:00Z',cierra_estricto:false,creada_por:administrator.id});
    grades.push(await f.row('calificaciones',{alumno_id:pupil.studentId,asignacion_id:assignment,p1:0,capturado_por:administrator.id}));
  }
  const foreignSubject=await f.row('materias',{nombre:'Foreign synthetic subject',clave:'FLOW-FOREIGN-'+Date.now(),semestre:1,tipo:'obligatoria',activo:false});
  const foreignAssignment=await f.row('asignaciones',{ciclo_id:cycle,grupo_id:foreign,materia_id:foreignSubject,profesor_id:teacher.professorId});
  const future=await f.row('tareas',{asignacion_id:assignments[0],titulo:'Synthetic future task',instrucciones:"Synthetic verification instructions",parcial:1,puntos:10,fecha_apertura:'2020-01-01T00:00:00Z',fecha_entrega:new Date(Date.now()+86400000).toISOString(),creada_por:administrator.id});
  const privateTask=await f.row('tareas',{asignacion_id:foreignAssignment,titulo:'Foreign synthetic task',instrucciones:"Synthetic verification instructions",parcial:1,puntos:10,fecha_apertura:'2020-01-01T00:00:00Z',fecha_entrega:'2020-01-02T00:00:00Z',creada_por:administrator.id});
  await f.row('calificaciones',{alumno_id:other.studentId,asignacion_id:foreignAssignment,p1:8,p2:8,p3:8,capturado_por:administrator.id});
  let d=await checked(administrator.client.rpc('security_cycle_diagnostic',{p_cycle:cycle}),'diagnostic');
  assert.equal(d.puede_cerrar,false);assert.equal(d.calificaciones_incompletas,3);
  assert.ok((await administrator.client.rpc('security_cycle_transition',{p_cycle:cycle,p_action:'cerrar',p_reason:'Synthetic verification closure'})).error,'Incomplete grades allowed closing');
  assert.ok((await pupil.client.rpc('security_cycle_transition',{p_cycle:cycle,p_action:'cerrar',p_reason:'Forbidden pupil closure'})).error,'Pupil transition allowed');
  assert.ok((await pupil.client.from('ciclos_escolares').update({activo:true}).eq('id',cycle)).error,'Direct lifecycle update allowed');
  console.log('PASS cycle: incomplete records block closing; pupil/direct lifecycle writes denied.');
  const inbox=await mobile(pupil,'pending');assert.equal(inbox.response.status,200);
  assert.ok(inbox.data.items.some(i=>i.id===future));assert.ok(!inbox.data.items.some(i=>i.id===privateTask));
  const foreignInbox=await mobile(other,'pending');assert.ok(!foreignInbox.data.items.some(i=>i.id===future));
  assert.equal((await mobile(pupil,'cycles')).response.status,403);
  const adminCycles=await mobile(administrator,'cycles?id='+cycle);assert.equal(adminCycles.response.status,200);
  const unconfirmed=await mobile(administrator,'cycles','POST',{id:cycle,action:'cerrar',reason:'Synthetic verification closure',confirmed:false});assert.equal(unconfirmed.response.status,400);
  console.log('PASS shared mobile API: own pending tasks; foreign group excluded; cycles role/MFA and explicit confirmation.');
  for(const grade of grades)await checked(f.admin.from('calificaciones').update({p2:0,p3:0}).eq('id',grade),'complete grade');
  await checked(f.admin.from('calificaciones').update({faltas_p1:21}).eq('id',grades[0]),'absence fixture');
  for(let i=0;i<3;i++)await f.row('reportes_conducta',{alumno_id:pupil.studentId,profesor_id:teacher.professorId,tipo:'negativo',categoria:'Synthetic verification',descripcion:'Synthetic verification report',fecha:new Date().toISOString().slice(0,10)});
  const {calcularRiesgoCiclo}=load('src/lib/riesgo/score.ts');
  const scores=await calcularRiesgoCiclo(f.admin,cycle);
  assert.equal(scores.find(r=>r.alumno_id===pupil.studentId).score,95);
  f.cleanups.push(async()=>{await checked(f.admin.from('riesgo_snapshots').delete().eq('ciclo_id',cycle),'cleanup risk');});
  const saved=await checked(f.admin.rpc('security_save_risk_run',{p_cycle:cycle,p_rows:scores,p_origin:'manual_admin'}),'save risk');
  assert.equal(saved.notificaciones,1);
  const repeat=await checked(f.admin.rpc('security_save_risk_run',{p_cycle:cycle,p_rows:scores,p_origin:'manual_admin'}),'repeat risk');assert.equal(repeat.notificaciones,0);
  const concurrent=await Promise.all([f.admin.rpc('security_save_risk_run',{p_cycle:cycle,p_rows:scores,p_origin:'cron_reglas'}),f.admin.rpc('security_save_risk_run',{p_cycle:cycle,p_rows:scores,p_origin:'cron_reglas'})]);
  assert.equal(concurrent.filter(r=>r.data?.duplicada).length,1);assert.ok(concurrent.every(r=>!r.error));
  assert.ok((await pupil.client.rpc('security_save_risk_run',{p_cycle:cycle,p_rows:scores,p_origin:'manual_admin'})).error);
  const notes=await checked(f.admin.from('notificaciones').select('id').eq('user_id',counselor.id).eq('tipo','riesgo'),'risk notice');assert.equal(notes.length,1);
  const scoped=await checked(counselor.client.rpc('security_latest_risk',{p_cycle:cycle}),'scoped risk');assert.equal(scoped.length,1);
  const stranger=await checked(pupil.client.rpc('security_latest_risk',{p_cycle:cycle}),'pupil risk');assert.equal(stranger.length,0);
  console.log('PASS risk persistence: score 95; transactional snapshots; one alert on entering critical; concurrent daily cron dedup; RLS and service-only save.');
  const guide=await f.row('guias_escolares',{ciclo_id:cycle,ciclo_label:'Synthetic verification cycle',titulo:'Prueba técnica · no es convocatoria',requisitos:'Contenido sintético de prueba.',fechas:'Sin fechas de admisión reales.',preguntas:'¿Es una convocatoria? No. Prueba técnica temporal.',publicada:false});
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  assert.equal((await checked(anon.from('guias_escolares').select('id').eq('id',guide),'draft read')).length,0);
  await checked(f.admin.from('guias_escolares').update({publicada:true}).eq('id',guide),'publish fixture');
  const publicGuides=await fetch(base+'/api/public/guides').then(r=>r.json());assert.ok(publicGuides.guides.some(g=>g.id===guide));
  await checked(f.admin.from('guias_escolares').update({publicada:false}).eq('id',guide),'unpublish fixture');
  assert.ok((await anon.from('guias_escolares').update({titulo:'Forbidden'}).eq('id',guide)).error);
  console.log('PASS guide: drafts hidden, published public API, anonymous editing denied.');
  d=await checked(administrator.client.rpc('security_cycle_diagnostic',{p_cycle:cycle}),'complete diagnostic');assert.equal(d.puede_cerrar,true);
  const closed=await mobile(administrator,'cycles','POST',{id:cycle,action:'cerrar',reason:'Synthetic verification closure',confirmed:true});assert.equal(closed.response.status,200);
  assert.ok((await f.admin.from('calificaciones').update({p1:7}).eq('id',grades[0])).error,'Closed grade was mutable');
  assert.ok((await f.admin.from('tareas').update({titulo:'Forbidden after closing'}).eq('id',future)).error,'Closed task was mutable');
  assert.ok((await administrator.client.rpc('security_cycle_transition',{p_cycle:cycle,p_action:'activar',p_reason:'Synthetic verification activation'})).error,'Closed cycle activated');
  await checked(administrator.client.rpc('security_cycle_transition',{p_cycle:cycle,p_action:'reabrir',p_reason:'Synthetic verification correction'}),'reopen');
  const history=await checked(administrator.client.from('ciclo_historial').select('accion').eq('ciclo_id',cycle).order('created_at'),'history');assert.deepEqual(history.map(h=>h.accion),['cerrar','reabrir']);
  assert.equal((await checked(pupil.client.from('ciclo_historial').select('id').eq('ciclo_id',cycle),'private history')).length,0);
  await checked(f.admin.from('calificaciones').update({p1:7}).eq('id',grades[0]),'reopened correction');
  console.log('PASS complete cycle: authenticated native API closes; closed writes/reactivation blocked; audited reopen restores corrections; history private.');
}finally{
  if(cycle&&administrator){const state=await f.admin.from('ciclos_escolares').select('cerrado_en').eq('id',cycle).maybeSingle();if(state.data?.cerrado_en)await checked(administrator.client.rpc('security_cycle_transition',{p_cycle:cycle,p_action:'reabrir',p_reason:'Synthetic verification cleanup'}),'cleanup reopen');}
  await f.cleanup();
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
