// Synthetic handler contracts: no database, accounts, filesystem fixtures or network.
const assert=require('node:assert/strict');
const {load}=require('./security-loader.cjs');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const actor=id(1),student=id(2),exam=id(3),attempt=id(4),question=id(5),cycle=id(6);
let rows={},errors=new Set(),calls=[],rpcCalls=[],role='alumno',denied=null,limit=true,rpcResult,readyResult={data:true,error:null},readyCalls=0;
function query(table){let predicates=[],start=0,end=Infinity,single=false;
 const q={select(columns){calls.push({table,columns});return q;},eq(k,v){predicates.push(r=>r[k]===v);return q;},is(k,v){predicates.push(r=>r[k]===v);return q;},in(k,v){predicates.push(r=>v.includes(r[k]));return q;},order(){return q;},limit(n){end=n-1;return q;},range(a,b){start=a;end=b;return q;},maybeSingle(){single=true;return q;},
 then(resolve,reject){let data=(rows[table]||[]).filter(r=>predicates.every(p=>p(r))).slice(start,end+1);return Promise.resolve({data:single?(data[0]??null):data,error:errors.has(table)?{code:'SYNTHETIC'}:null}).then(resolve,reject);}};return q;}
const client={from:query};
const reply=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
const modules={'@/lib/security/mobile':{mobileReply:reply,mobileIdentity:async()=>denied?{response:reply('Denied',denied)}:{user:{id:actor},profile:{rol:role},client,service:{rpc:async(name,args)=>{if(name==='security_mobile_learning_ready'){readyCalls++;return readyResult;}rpcCalls.push({name,args});return rpcResult;}}}},'@/lib/security/rate-limit':{rateLimit:async()=>{if(limit instanceof Error)throw limit;return limit;}}};
const route=load('src/app/api/mobile/exams/route.ts',modules);
const helper=load('src/lib/security/mobile-exams.ts');
function reset(){readyResult={data:true,error:null};readyCalls=0;calls=[];rpcCalls=[];errors.clear();denied=null;limit=true;role='alumno';rpcResult={data:attempt,error:null};rows={
 alumnos:[{id:student,perfil_id:actor,deleted_at:null}],ciclos_escolares:[{id:cycle,cerrado_en:null}],
 examenes:[{id:exam,asignacion_id:id(7),titulo:'Synthetic exam',duracion_min:30,fecha_apertura:'2026-01-01T00:00:00Z',fecha_cierre:'2030-01-01T00:00:00Z',intentos_max:1,aleatorizar:true,mostrar_resultados:false,asignacion:{ciclo_id:cycle,materia:{nombre:'Synthetic'}}}],
 examen_intentos:[],examen_preguntas:[{id:question,examen_id:exam,tipo:'opcion_multiple',enunciado:'Synthetic',puntos:10,orden:1,respuesta_correcta:'A',opciones:[{clave:'A',texto:'Synthetic',correcta:true}]}],examen_respuestas:[]};}
async function request(body,query=''){const req=new Request('https://school.invalid/api/mobile/exams'+query,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return route[req.method](req);}
async function taskReceipts(){
 let removes=0,lastPath='',outcome='known',uploaded=true;
 const storage={upload:async path=>{lastPath=path;return uploaded?{error:null}:{error:{code:'SYNTHETIC'}};},remove:async()=>{removes++;return {error:null};}};
 const taskClient={from:table=>{let pathFilter='';const q={select(){return q;},eq(key,value){if(key==='archivo_url')pathFilter=value;return q;},maybeSingle:async()=>({error:null,data:table==='tareas'?{id:exam,permite_archivos:true}:outcome==='committed'&&pathFilter===lastPath?{id:attempt}:null})};return q;}};
 const service={storage:{from:()=>storage},rpc:async(name)=>{if(name==='security_mobile_learning_ready')return{data:true,error:null};if(outcome==='throw')throw Error('Synthetic lost transport');return outcome==='known'?{error:{code:'P0001'}}:{error:{message:'Synthetic lost transport'}};}};
 const task=load('src/app/api/mobile/tasks/route.ts',{'@/lib/security/mobile':{mobileReply:reply,mobileIdentity:async()=>({user:{id:actor},profile:{rol:'alumno'},client:taskClient,service})},
  '@/lib/security/rate-limit':{rateLimit:async()=>true},'@/lib/security/upload-tickets':{receiveUploadTicketForActor:async(ticket,id)=>{assert.equal(id,actor);return new File(['%PDF-1.7'],'synthetic.pdf',{type:'application/pdf'});},UPLOAD_PREFIX:'unused.'}});
 const send=()=>task.POST(new Request('https://school.invalid/api/mobile/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task_id:exam,comment:'Synthetic response',upload_ticket:'synthetic-ticket'})}));
 assert.equal((await send()).status,409);assert.equal(removes,1,'Known rollback removes new bytes');
 outcome='committed';assert.equal((await send()).status,200);assert.equal(removes,1,'Committed response lost: keep referenced bytes');
 outcome='unknown';assert.equal((await send()).status,503);assert.equal(removes,1,'Unknown result: keep possibly committed bytes');
 outcome='throw';assert.equal((await send()).status,503);assert.equal(removes,1,'Throw after dispatch must not erase committed bytes');
 uploaded=false;assert.equal((await send()).status,503);assert.equal(removes,2,'Pre-transaction upload failure cleans bytes');
 console.log('PASS synthetic task-file receipt failures: known rollback cleanup, transport ambiguity/readback and committed-byte retention.');
}
async function readinessContracts(){
 const readiness=load('src/lib/security/native-learning.ts');
 for(const [result,expected] of [[{data:true,error:null},true],[{data:false,error:null},false],[{data:'true',error:null},false],[{data:null,error:{code:'PGRST202'}},false],[{data:true,error:{code:'SYNTHETIC'}},false]]){
  assert.equal(await readiness.nativeLearningReady({rpc:async name=>{assert.equal(name,'security_mobile_learning_ready');return result;}}),expected);
 }
 assert.equal(await readiness.nativeLearningReady({rpc:async()=>{throw Error('Synthetic transport');}}),false);
 for(const result of [{data:false,error:null},{data:null,error:{code:'PGRST202'}},{data:'true',error:null}]){
  reset();readyResult=result;
  assert.equal((await request({action:'start',exam_id:exam})).status,503);assert.equal(rpcCalls.length,0);assert.equal(readyCalls,1);
  readyCalls=0;assert.equal((await request(undefined,'?exam_id='+exam)).status,200);assert.equal(readyCalls,0,'Existing read must not require new migration');
 }
 let metadata=0,mutations=0,tickets=0,storage=0;
 const service={rpc:async name=>{if(name==='security_mobile_learning_ready'){metadata++;return {data:false,error:null};}mutations++;assert.equal(name,'security_mobile_submit_task');return {data:{ok:true},error:null};},
  storage:{from:()=>({upload:async()=>{storage++;throw Error('Must not upload');},remove:async()=>{storage++;},createSignedUploadUrl:async()=>{storage++;throw Error('Must not prepare');}})}};
 const identity={user:{id:actor},profile:{rol:'alumno'},client:{from:()=>{throw Error('No task read while unavailable');}},service};
 const shared={'@/lib/security/mobile':{mobileReply:reply,mobileIdentity:async()=>identity},'@/lib/security/rate-limit':{rateLimit:async()=>true},
  '@/lib/security/upload-tickets':{receiveUploadTicketForActor:async()=>{tickets++;throw Error('Must not consume');},createUploadTicket:()=>{tickets++;throw Error('Must not create');},UPLOAD_BUCKET:'security-uploads'}};
 const tasks=load('src/app/api/mobile/tasks/route.ts',shared);
 const taskReq=body=>new Request('https://school.invalid/api/mobile/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await tasks.POST(taskReq({task_id:exam,comment:'Legacy text'}))).status,200);assert.equal(metadata,0);assert.equal(mutations,1,'Legacy text remains compatible');
 assert.equal((await tasks.POST(taskReq({task_id:exam,comment:'New attachment',upload_ticket:'synthetic-ticket'}))).status,503);
 assert.equal(mutations,1);assert.equal(tickets,0);assert.equal(storage,0);
 const prepare=load('src/app/api/mobile/task-files/route.ts',shared);
 assert.equal((await prepare.POST(new Request('https://school.invalid/api/mobile/task-files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare',task_id:exam,name:'synthetic.pdf',type:'application/pdf',size:9})}))).status,503);
 assert.equal(mutations,1);assert.equal(tickets,0);assert.equal(storage,0);
 console.log('PASS native rollout gate: missing/error/false/nonboolean readiness denies new writes before RPC/storage/ticket; reads and legacy text remain compatible.');
}

async function main(){
 reset();assert.equal(helper.examAnswers({[question]:'answer'}),true);assert.equal(helper.examAnswers({wrong:'answer'}),false);assert.equal(helper.examAnswers({[question]:1}),false);assert.equal(helper.examAnswers({[question]:'x'.repeat(10001)}),false);assert.equal(helper.examAnswers(Array(2)),false);
 const boundary=Object.fromEntries(Array.from({length:9},(_,n)=>[id(100+n), 'x'.repeat(n<8?10000:9621)]));
 assert.equal(Buffer.byteLength(JSON.stringify(boundary)),90000);assert.equal(helper.examAnswers(boundary),true);
 boundary[id(108)]+='x';assert.equal(Buffer.byteLength(JSON.stringify(boundary)),90001);assert.equal(helper.examAnswers(boundary),false,'JSON key/separator bytes must count, not only answer text');
 const unicode=Object.fromEntries(Array.from({length:9},(_,n)=>[id(100+n),'ñ'.repeat(5000)]));assert.equal(helper.examAnswers(unicode),false,'UTF8 JSON budget must include Unicode and keys');
 reset();rows.examen_intentos=[{id:attempt,alumno_id:student,examen_id:exam}];assert.equal((await request({action:'submit',attempt_id:attempt,answers:boundary})).status,400);assert.equal(rpcCalls.length,0,'Oversized JSON must never reach the transaction');
 reset();
 denied=401;assert.equal((await request()).status,401);denied=403;assert.equal((await request({action:'start',exam_id:exam})).status,403);
 reset();role='profesor';assert.equal((await request()).status,403);reset();limit=false;assert.equal((await request()).status,429);limit=Error('Unavailable');assert.equal((await request()).status,503);
 reset();errors.add('alumnos');assert.equal((await request()).status,503);reset();rows.alumnos=[];assert.equal((await request()).status,403);
 reset();const preview=await request(undefined,'?exam_id='+exam);assert.equal(preview.status,200);assert.equal(preview.headers.get('cache-control'),'private, no-store');const p=await preview.json();assert.equal(p.attempt,null);assert.deepEqual(p.questions,[]);assert.equal(rpcCalls.length,0);
 reset();rows.examen_intentos=[{id:attempt,alumno_id:student,examen_id:exam,estado:'calificado',inicio:'2026-01-01T00:00:00Z',numero:1,calificacion:10}];rows.examen_respuestas=[{pregunta_id:question,intento_id:attempt,respuesta:'A',correcta:true,puntos_obtenidos:10}];
 const detail=await (await request(undefined,'?exam_id='+exam)).json();assert.equal(detail.attempt.calificacion,null);assert.deepEqual(detail.questions[0].opciones,[{clave:'A',texto:'Synthetic'}]);for(const key of ['respuesta_correcta','correcta','puntos_obtenidos'])assert.ok(!JSON.stringify(detail).includes('"'+key+'"'));
 rows.examenes[0].mostrar_resultados=true;assert.equal((await(await request(undefined,'?exam_id='+exam)).json()).attempt.calificacion,10);
 reset();errors.add('examen_preguntas');rows.examen_intentos=[{id:attempt,alumno_id:student,examen_id:exam,estado:'en_curso',inicio:'2026-01-01T00:00:00Z',numero:1}];assert.equal((await request(undefined,'?exam_id='+exam)).status,503);
 reset();rows.ciclos_escolares[0].cerrado_en='2026-01-01T00:00:00Z';assert.equal((await request({action:'start',exam_id:exam})).status,409);assert.equal(rpcCalls.length,0);
 reset();const start=await request({action:'start',exam_id:exam,p_actor_id:id(999)});assert.equal(start.status,404);assert.equal(rpcCalls[0].args.p_actor_id,actor);
 reset();assert.equal((await request({action:'save',attempt_id:attempt,answers:{[question]:'A'}})).status,404);assert.equal(rpcCalls.length,0);
 reset();rows.examen_intentos=[{id:attempt,alumno_id:student,examen_id:exam}];rpcResult={data:{ok:true},error:null};assert.equal((await request({action:'submit',attempt_id:attempt,answers:{[question]:'A'},p_actor_id:id(999)})).status,200);assert.equal(rpcCalls[0].args.p_actor_id,actor);assert.equal(rpcCalls[0].args.p_submit,true);
 rpcResult={error:{code:'SYNTHETIC'}};assert.equal((await request({action:'save',attempt_id:attempt,answers:{[question]:'A'}})).status,409);
 await taskReceipts();
 await readinessContracts();
 console.log('PASS synthetic mobile exam contracts: actor binding, role/access/rate/query failures, no side-effect preview, cycle/ownership, sanitization and publication gating. No DB or network.');
}
module.exports={verify:main};
if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
