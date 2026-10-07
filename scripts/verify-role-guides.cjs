// Meaningful browser checks: real role-filtered menus and read-only help; no saved sessions/artifacts.
if (!process.argv.includes('--live')) throw Error('Requires --live: temporary synthetic accounts only.');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtures } = require('./flow-fixtures.cjs');
const f = createFixtures(), base = process.env.FLOW_BASE_URL ?? 'http://localhost:3002';
let browser;
async function dismissConsent(page) { const reject = page.getByRole('button', { name: /rechazar opcionales/i }); await reject.waitFor({state:'visible',timeout:3000}).catch(()=>{}); if (await reject.isVisible()) await reject.click(); }
async function exercise(page, role, title) {
  const launch = page.getByRole('button', {name: `Abrir Guía de uso: ${title}`, exact:true});
  await launch.waitFor();await dismissConsent(page);await launch.click();
  const dialog = page.getByRole('dialog', {name:'Tu guía del sistema'});
  await dialog.waitFor();assert.equal(await dialog.locator('[data-help-role]').getAttribute('data-help-role'),role);
  if(role==='alumno')assert.equal(await dialog.locator('a[href^="/admin"]').count(),0);
  if(role==='finanzas'){
    assert.equal(await dialog.locator('a[href="/admin/pagos"]').count(),1);
    for(const path of ['/admin/ciclos','/admin/usuarios','/admin/publico'])assert.equal(await dialog.locator(`a[href="${path}"]`).count(),0);
  }
  await dialog.getByRole('button',{name:'Recorrer mis secciones',exact:true}).click();
  const walk=page.getByRole('dialog',{name:'Conoce tus secciones'});
  await walk.getByText(/^Paso 1 de/).waitFor();
  await walk.getByRole('button',{name:'Siguiente',exact:true}).click();
  await walk.getByText(/^Paso 2 de/).waitFor();
  await walk.getByRole('button',{name:'Anterior',exact:true}).click();
  await walk.getByText(/^Paso 1 de/).waitFor();
  await walk.getByRole('button',{name:'Siguiente',exact:true}).click();
  await walk.getByRole('button',{name:'Reiniciar',exact:true}).click();
  await walk.getByText(/^Paso 1 de/).waitFor();
  await walk.getByRole('button',{name:'Ver secciones',exact:true}).click();
  const writes=[];const observe=request=>{if(['POST','PATCH','PUT','DELETE'].includes(request.method()))writes.push(request.method());};
  page.on('request',observe);
  await dialog.getByRole('button',{name:'Explicar botones de esta pantalla',exact:true}).click();
  const controls=page.getByRole('dialog',{name:'Botones de esta pantalla'});
  await controls.getByText(/^Paso 1 de/).waitFor();
  assert.equal(await page.locator('[class*="highlight"]').count(),1);
  await controls.getByRole('button',{name:'Siguiente',exact:true}).click();
  await controls.getByRole('button',{name:'Reiniciar',exact:true}).click();
  await page.keyboard.press('Escape');
  await controls.waitFor({state:'hidden'});
  assert.deepEqual(writes,[],'Walkthrough performed a mutation');page.off('request',observe);
  assert.equal(await launch.evaluate(el=>el===document.activeElement),true,'Help did not restore focus');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
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
    const account=await f.account(role,97);if(['admin','staff','director','finanzas'].includes(role))await f.enroll(account);
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.addCookies([...account.cookies.values()].map(cookie=>({name:cookie.name,value:cookie.value,url:base})));
    const page=await context.newPage(), runtime=[];page.on('pageerror',e=>runtime.push(e.message));
    await page.goto(base+route);await exercise(page,role,title);
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
