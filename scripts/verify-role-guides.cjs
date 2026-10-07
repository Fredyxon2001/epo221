// Meaningful browser checks: real role-filtered menus and read-only help; no saved sessions/artifacts.
if (!process.argv.includes('--live')) throw Error('Requires --live: temporary synthetic accounts only.');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtures } = require('./flow-fixtures.cjs');
const f = createFixtures(), base = process.env.FLOW_BASE_URL ?? 'http://localhost:3002';
let browser;
async function dismissConsent(page) { const reject = page.getByRole('button', { name: /rechazar opcionales/i }); await reject.waitFor({state:'visible',timeout:3000}).catch(()=>{}); if (await reject.isVisible()) await reject.click(); }
async function exercise(page, role, title) {
  const originalURL=page.url();
  const launch = page.getByRole('button', {name: 'Abrir Guía de uso: '+title, exact:true});
  await launch.waitFor();await dismissConsent(page);await launch.click();
  let dialog = page.getByRole('dialog', {name:'Tu guía del sistema'});
  await dialog.waitFor();assert.equal(await dialog.locator('[data-help-role]').getAttribute('data-help-role'),role);
  assert.equal(await dialog.locator('[data-avatar-role]').getAttribute('data-avatar-role'),title.includes('Orientación')?'orientacion':role);
  await dialog.getByRole('button',{name:'¿Qué puede hacer mi rol? '+title,exact:true}).click();
  if(role==='alumno')assert.equal(await dialog.locator('a[href^="/admin"]').count(),0);
  if(role==='finanzas'){
    assert.equal(await dialog.locator('a[href="/admin/pagos"]').count(),1);
    for(const path of ['/admin/ciclos','/admin/usuarios','/admin/publico'])assert.equal(await dialog.locator('a[href="'+path+'"]').count(),0);
  }
  const paths=await dialog.locator('ul a[href]').evaluateAll(anchors=>anchors.map(a=>a.getAttribute('href')));
  const writes=[];const observe=request=>{if(['POST','PATCH','PUT','DELETE'].includes(request.method()))writes.push(request.method());};
  page.on('request',observe);
  await dialog.getByRole('button',{name:'Recorrer mis secciones',exact:true}).click();
  let walk=page.getByRole('dialog',{name:'Conoce tus secciones'});
  await page.waitForURL(url=>url.pathname===paths[0].split('?')[0]);
  await walk.getByText(/^Módulo 1 de/).waitFor();
  await walk.getByText(/^Paso 1 de/).waitFor();
  await walk.getByRole('button',{name:'Siguiente',exact:true}).waitFor();
  await walk.getByRole('button',{name:'Siguiente',exact:true}).click();
  await walk.getByText(/^Paso 2 de/).waitFor();
  await walk.getByRole('button',{name:'Anterior',exact:true}).click();
  await walk.getByText(/^Paso 1 de/).waitFor();
  let explained=0;
  for(let i=0;i<1000;i++){
    if(await walk.getByRole('button',{name:'Siguiente módulo',exact:true}).isVisible())break;
    const next=walk.getByRole('button',{name:'Siguiente',exact:true});
    if(!await next.isVisible())break;
    await next.click();explained++;
    assert.equal(new URL(page.url()).pathname,paths[0].split('?')[0],'A control explanation navigated before completing its module');
  }
  assert.ok(explained>0,'Module skipped controls');
  await walk.getByRole('button',{name:'Siguiente módulo',exact:true}).click();
  await page.waitForURL(url=>url.pathname===paths[1].split('?')[0]);
  walk=page.getByRole('dialog',{name:'Conoce tus secciones'});
  await walk.getByText(/^Módulo 2 de/).waitFor();await walk.getByText(/^Paso 1 de/).waitFor();
  await walk.getByRole('button',{name:'Siguiente',exact:true}).waitFor();
  await walk.getByRole('button',{name:'Anterior',exact:true}).click();
  await page.waitForURL(url=>url.pathname===paths[0].split('?')[0]);
  await walk.getByText(/^Módulo 1 de/).waitFor();await walk.getByRole('button',{name:'Reiniciar',exact:true}).click();
  await walk.getByText(/^Paso 1 de/).waitFor();await page.keyboard.press('Escape');
  assert.deepEqual(writes,[],'Module tour performed a mutation');page.off('request',observe);
  // Return to the exact originating form for contextual-control and dangerous-form checks.
  await page.goto(originalURL);await dismissConsent(page);await launch.click();
  dialog=page.getByRole('dialog',{name:'Tu guía del sistema'});await dialog.waitFor();
  page.on('request',observe);
  await dialog.getByRole('button',{name:'Explicar botones de esta pantalla',exact:true}).click();
  const controls=page.getByRole('dialog',{name:'Botones de esta pantalla'});
  await controls.getByText(/^Paso 1 de/).waitFor();
  await page.locator('[class*="highlight"]').waitFor({state:'visible'});
  assert.equal(await page.locator('[class*="highlight"]').count(),1);
  await controls.getByRole('button',{name:'Siguiente',exact:true}).click();
  await controls.getByRole('button',{name:'Reiniciar',exact:true}).click();
  await page.keyboard.press('Escape');await controls.waitFor({state:'hidden'});
  assert.deepEqual(writes,[],'Control walkthrough performed a mutation');page.off('request',observe);
  assert.equal(await launch.evaluate(el=>el===document.activeElement),true,'Help did not restore focus');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
}
async function sharedRoutes(page) {
  const writes = [], observe = request => { if (['POST','PATCH','PUT','DELETE'].includes(request.method())) writes.push(request.method()); };
  page.on('request', observe);
  for (const [label, route] of [[/^Guiar.*app móvil$/i, '/app-movil'], ['Guiar Cambiar contraseña', '/cambiar-password']]) {
    await page.goto(base + '/alumno/pendientes');
    await page.getByRole('button', {name:'Abrir Guía de uso: Alumno',exact:true}).click();
    await page.getByRole('dialog', {name:'Tu guía del sistema'}).getByRole('button', {name:label}).click();
    await page.waitForURL(url => url.pathname === route);
    const dialog=page.getByRole('dialog', {name:'Conoce tus secciones'});
    await dialog.waitFor();await dialog.getByText(/^Paso 1 de .*Introducción del módulo/).waitFor();
    assert.equal(await dialog.locator('[data-help-role]').getAttribute('data-help-role'),'alumno');
    assert.equal(await dialog.locator('[data-avatar-role]').getAttribute('data-avatar-role'),'alumno');
    await dialog.getByRole('button', {name:'Siguiente',exact:true}).waitFor();
    for(let i=0;i<100;i++) { const next=dialog.getByRole('button',{name:'Siguiente',exact:true});if(!await next.isVisible())break;await next.click();assert.equal(new URL(page.url()).pathname,route); }
    await dialog.getByText(/^Fin del módulo\./).waitFor();
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    if(route==='/app-movil') {
      const publicLauncher=page.getByRole('button',{name:'Abrir Guía de uso: Visitantes y familias',exact:true});await publicLauncher.waitFor();
      assert.equal(await page.getByRole('dialog').count(),0,'Closing private help reopened public help');
      assert.equal(await publicLauncher.evaluate(element=>element===document.activeElement),true,'Shared help did not restore launcher focus');
    } else assert.equal(await page.getByRole('button',{name:/Abrir Guía de uso:/}).count(),0,'Password only-resume exposed a new public tour');
    await page.reload();assert.equal(await page.getByRole('dialog').count(),0,'Refresh resumed a completed transition');
  }
  page.off('request',observe);assert.deepEqual(writes,[],'Shared-route tour changed password or performed an action');
  console.log('PASS alumno shared App/password routes: private role/avatar retained, intro/all controls, no password submit, close returns public launcher only on App, reload does not resume.');
}
async function inspectAuthenticatorEnrollment(account) {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try {
    await context.addCookies([...account.cookies.values()].map(cookie=>({name:cookie.name,value:cookie.value,url:base})));
    const page=await context.newPage();await page.goto(base+'/seguridad');
    await page.getByRole('button',{name:'Configurar autenticador',exact:true}).waitFor();
    await page.getByText('Aplicación recomendada: Google Authenticator, de Google LLC.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Descargar para Android',exact:true}).getAttribute('href'),'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2');
    assert.equal(await page.getByRole('link',{name:'Descargar para iPhone',exact:true}).getAttribute('href'),'https://apps.apple.com/app/google-authenticator/id388497605');
  } finally { await context.close(); }
}
async function main(){try{
  browser=await chromium.launch({headless:false});
  const publicPage=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];publicPage.on('pageerror',e=>errors.push(e.message));
  await publicPage.goto(base+'/publico');await dismissConsent(publicPage);
  await exercise(publicPage,'publico','Visitantes y familias');
  // Nested dialogs must leave the underlying menu open and restore body scroll after both close.
  await publicPage.getByRole('button',{name:'Menú',exact:true}).click();
  await publicPage.getByRole('button',{name:'Abrir Guía de uso: Visitantes y familias',exact:true}).click();
  await publicPage.getByRole('dialog',{name:'Tu guía del sistema'}).waitFor();await publicPage.keyboard.press('Escape');
  assert.equal(await publicPage.getByRole('button',{name:'Menú',exact:true}).getAttribute('aria-expanded'),'true');
  await publicPage.keyboard.press('Escape');assert.equal(await publicPage.evaluate(()=>document.body.style.overflow),'');
  assert.deepEqual(errors,[]);await publicPage.close();console.log('PASS public guide steps, button highlighting, no mutations, Escape/focus and nested menu scroll restoration.');

  const cycle=await f.row('ciclos_escolares',{codigo:'FLOW-GUIDE-ROLES-'+Date.now(),periodo:'Verification',activo:false});
  const roles=[['alumno','Alumno','/alumno/pendientes'],['profesor','Docente','/profesor/pendientes'],['admin','Administración','/admin/pendientes'],['staff','Personal operativo','/admin/pendientes'],['director','Dirección','/director/pendientes'],['finanzas','Finanzas','/admin/pendientes']];
  for(const [role,title,route] of roles){
    const account=await f.account(role,97);if(['admin','staff','director','finanzas'].includes(role)){await inspectAuthenticatorEnrollment(account);await f.enroll(account);}
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.addCookies([...account.cookies.values()].map(cookie=>({name:cookie.name,value:cookie.value,url:base})));
    const page=await context.newPage(), runtime=[];page.on('pageerror',e=>runtime.push(e.message));
    await page.goto(base+route);await exercise(page,role,title);
    if(role==='alumno')await sharedRoutes(page);
    if(role==='profesor'){
      await f.row('grupos',{ciclo_id:cycle,grado:1,semestre:1,grupo:1,turno:'matutino',orientador_id:account.professorId});
      await page.reload();await exercise(page,role,'Docente · Orientación');
    }
    // A walkthrough on a dangerous form must never submit it.
    if(role==='admin'){
      await page.goto(base+'/admin/ciclos?ciclo='+cycle);
      const before=await f.admin.from('ciclo_historial').select('id',{count:'exact',head:true}).eq('ciclo_id',cycle);
      await exercise(page,role,title);
      const after=await f.admin.from('ciclo_historial').select('id',{count:'exact',head:true}).eq('ciclo_id',cycle);
      assert.equal(after.count,before.count,'Help changed the cycle');
    }
    assert.deepEqual(runtime,[]);await context.close();console.log(`PASS ${role}: real menu scope, role appearance, steps, contextual controls, no writes and no runtime errors.`);
  }
}finally{if(browser)await browser.close();await f.cleanup();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
