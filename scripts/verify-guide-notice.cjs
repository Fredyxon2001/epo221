const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createFixtures}=require('./flow-fixtures.cjs');
if(!process.argv.includes('--live'))throw Error('Requires --live');
const base=process.env.FLOW_BASE_URL||'http://localhost:3002',diagnose=process.argv.includes('--diagnose-guarded'),f=createFixtures();
let browser,coachOpen=true,report={base,diagnose,postAttemptsWhileCoach:0,postAttemptsAfterClose:0,readsWhileCoach:null,readsAfterClose:null,status:'RUNNING'};
(async()=>{try{
 const pupil=await f.account('alumno',93),teacher=await f.account('profesor',93);
 const notice=await f.row('avisos',{autor_id:teacher.id,autor_tipo:'profesor',alcance:'alumno',alumno_id:pupil.studentId,titulo:'Flow fixture coach read guard',cuerpo:'Only a synthetic pupil and author can access this verification notice.'});
 f.cleanups.push(async()=>{const r=await f.admin.from('avisos_lecturas').delete().eq('aviso_id',notice).in('user_id',[pupil.id,teacher.id]);if(r.error)throw Error('Own notice cleanup failed');});
 async function reads(){const r=await f.admin.from('avisos_lecturas').select('aviso_id',{count:'exact',head:true}).eq('aviso_id',notice).eq('user_id',pupil.id);if(r.error)throw Error('Own read query failed');return r.count||0;}
 assert.equal(await reads(),0);
 const own=await pupil.client.from('avisos').select('id').eq('id',notice).maybeSingle();assert.ok(own.data,'Own pupil cannot read its synthetic notice');
 browser=await chromium.launch({headless:false});const ctx=await browser.newContext({viewport:{width:390,height:844}});
 await ctx.addCookies([...pupil.cookies.values()].map(c=>({name:c.name,value:c.value,url:base})));
 const p=await ctx.newPage();
 p.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/alumno/avisos'){if(coachOpen)report.postAttemptsWhileCoach++;else report.postAttemptsAfterClose++;}});
 if(diagnose)await p.route(url=>url.pathname==='/alumno/avisos',route=>route.request().method()==='POST'?route.abort():route.continue());
 await p.goto(base+'/alumno/pendientes');const reject=p.getByRole('button',{name:'Rechazar opcionales',exact:true});if(await reject.isVisible())await reject.click();
 await p.getByRole('button',{name:'Abrir Guía de uso: Alumno',exact:true}).click();
 await p.getByRole('dialog',{name:'Tu guía del sistema'}).getByRole('button',{name:'Guiar Avisos',exact:true}).click();
 await p.waitForURL('**/alumno/avisos');const guide=p.getByRole('dialog',{name:'Conoce tus secciones'});await guide.waitFor();
 await p.waitForTimeout(2500);report.readsWhileCoach=await reads();
 assert.equal(report.readsWhileCoach,0,'Opening guide marked a synthetic notice read');
 if(diagnose){assert.ok(report.postAttemptsWhileCoach>0,'No original auto-mark attempt observed');report.status='DIAGNOSED_WITHOUT_MUTATION';}
 else{
  assert.equal(report.postAttemptsWhileCoach,0,'Guide attempted a read write while open');
  await guide.getByRole('button',{name:'Ver secciones',exact:true}).click();await p.waitForTimeout(2300);assert.equal(await reads(),0,'Overview left read timer active');
  coachOpen=false;await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
  for(let i=0;i<12;i++){report.readsAfterClose=await reads();if(report.readsAfterClose===1)break;await p.waitForTimeout(500);}
  assert.equal(report.readsAfterClose,1,'Closing guide did not resume normal reading');
  const nextNotice=await f.row('avisos',{autor_id:teacher.id,autor_tipo:'profesor',alcance:'alumno',alumno_id:pupil.studentId,titulo:'Flow fixture direct coach close',cuerpo:'Only synthetic notice direct-close verification.'});
  f.cleanups.push(async()=>{const r=await f.admin.from('avisos_lecturas').delete().eq('aviso_id',nextNotice).eq('user_id',pupil.id);if(r.error)throw Error('Second own notice cleanup failed');});
  async function nextReads(){const r=await f.admin.from('avisos_lecturas').select('aviso_id',{count:'exact',head:true}).eq('aviso_id',nextNotice).eq('user_id',pupil.id);if(r.error)throw Error('Second own notice read query failed');return r.count||0;}
  await p.goto(base+'/alumno/pendientes');coachOpen=true;report.postAttemptsWhileCoach=0;report.postAttemptsAfterClose=0;
  await p.getByRole('button',{name:'Abrir Guía de uso: Alumno',exact:true}).click();
  await p.getByRole('dialog',{name:'Tu guía del sistema'}).getByRole('button',{name:'Guiar Avisos',exact:true}).click();
  await p.waitForURL('**/alumno/avisos');await p.getByRole('dialog',{name:'Conoce tus secciones'}).waitFor();await p.waitForTimeout(2500);
  report.directCoachReadsWhileOpen=await nextReads();assert.equal(report.directCoachReadsWhileOpen,0);assert.equal(report.postAttemptsWhileCoach,0);
  coachOpen=false;await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});await p.waitForTimeout(2300);
  for(let i=0;i<12;i++){report.directCoachReadsAfterClose=await nextReads();if(report.directCoachReadsAfterClose===1)break;await p.waitForTimeout(500);}assert.equal(report.directCoachReadsAfterClose,1);report.status='PASS';
 }
 await ctx.close();
}finally{if(browser)await browser.close();await f.cleanup();report.cleanup='PASS';console.log(JSON.stringify(report,null,2));}
})().catch(error=>{console.error(JSON.stringify({status:'FAIL',failureKind:error.name||'Error',message:'Own synthetic notice guard assertion/setup failed; private diagnostics suppressed'}));process.exitCode=1;});
