// Public pages only, anonymous/rejected consent. No login, fixtures or POSTs.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const base=process.env.FLOW_BASE_URL||'http://localhost:3002';
const routes=['/publico','/publico/oferta','/publico/guia','/publico/convocatorias','/publico/descargas','/publico/noticias','/publico/albumes','/publico/conoce','/publico/contacto','/login','/app-movil','/cookies','/privacidad'];
const tags=['wcag2a','wcag2aa','wcag21aa','wcag22aa'];
(async()=>{
 const browser=await chromium.launch({headless:false});const report=[];
 try{
  for(const width of [390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await ctx.addCookies([{name:'epo221-cookie-consent',value:encodeURIComponent(JSON.stringify({version:2,external:false,analytics:false,savedAt:Date.now()-1000})),url:base}]);
   const p=await ctx.newPage();p.setDefaultTimeout(90000);let pageErrors=0,writes=0;
   p.on('pageerror',()=>pageErrors++);p.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes++;});
   for(const route of process.argv.includes('--interactive-only') ? [] : routes){
    const response=await p.goto(base+route,{waitUntil:'domcontentloaded',timeout:90000});assert.equal(response.status(),200);await p.locator('h1').first().waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(800);
    const axe=await new AxeBuilder({page:p}).withTags(tags).analyze();
    report.push({route,width,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    console.log('Axe '+route+' '+width+'px: '+axe.violations.length+' violations');
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');
   }
   await p.goto(base+'/publico');await p.locator('[data-cookie-ready="true"]').waitFor();await p.waitForTimeout(500);await p.keyboard.press('Tab');
   assert.ok(await p.evaluate(()=>document.activeElement?.textContent?.includes('Saltar')),'Skip link not first keyboard target');
   await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement?.id),'contenido-publico','Skip link did not focus content');
   if(width<1280){
    const menu=p.getByRole('button',{name:'Menú',exact:true});await menu.focus();await p.keyboard.press('Enter');
    const navigation=p.getByRole('dialog',{name:'Menú principal',exact:true});await navigation.waitFor();
    const scan=await new AxeBuilder({page:p}).withTags(tags).analyze();report.push({route:'public-menu-expanded',width,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    for(let i=0;i<12;i++){await p.keyboard.press('Tab');assert.equal(await navigation.evaluate(el=>el.contains(document.activeElement)),true,'Tab left mobile menu');}
    await p.keyboard.press('Escape');await navigation.waitFor({state:'hidden'});assert.equal(await menu.evaluate(el=>el===document.activeElement),true);
   }else{
    const summary=p.locator('summary').filter({hasText:'Más secciones'});await summary.focus();await p.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>el.parentElement.open),true);
    const scan=await new AxeBuilder({page:p}).withTags(tags).analyze();report.push({route:'public-menu-expanded',width,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    await p.keyboard.press('Escape');assert.equal(await summary.evaluate(el=>el.parentElement.open),false);assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
   }
   const launcher=p.getByRole('button',{name:'Abrir Guía de uso: Visitantes y familias',exact:true});await launcher.focus();await p.keyboard.press('Enter');
   const dialog=p.getByRole('dialog',{name:'Tu guía del sistema'});await dialog.waitFor();
   const guideAxe=await new AxeBuilder({page:p}).withTags(tags).analyze();report.push({route:'public-guide-overview',width,violations:guideAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
   for(let i=0;i<16;i++){await p.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true,'Tab left public guide');}
   await dialog.getByRole('button',{name:'Explicar botones de esta pantalla',exact:true}).focus();await p.keyboard.press('Enter');
   const coach=p.getByRole('dialog',{name:'Botones de esta pantalla',exact:true});await coach.waitFor();
   const coachAxe=await new AxeBuilder({page:p}).withTags(tags).analyze();report.push({route:'public-guide-coach',width,violations:coachAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
   for(let i=0;i<8;i++){await p.keyboard.press('Tab');assert.equal(await coach.evaluate(el=>el.contains(document.activeElement)),true,'Tab left public coach');}
   await p.keyboard.press('Escape');await coach.waitFor({state:'hidden'});assert.equal(await launcher.evaluate(el=>el===document.activeElement),true);
   await p.getByRole('button',{name:'Preferencias de cookies',exact:true}).focus();await p.keyboard.press('Enter');await p.locator('#cookie-heading').waitFor();
   const cookieAxe=await new AxeBuilder({page:p}).withTags(tags).analyze();report.push({route:'cookie-settings',width,violations:cookieAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
   assert.equal(await p.getByRole('checkbox').count(),2,'Optional categories must be independent');
   assert.equal(writes,0,'Anonymous a11y QA sent a mutation');assert.equal(pageErrors,0,'Runtime error');await ctx.close();
  }
  console.log(JSON.stringify({base,report,dbMutations:0,screenReaderTested:false},null,2));
  assert.equal(report.reduce((n,r)=>n+r.violations.length,0),0,'Axe found public accessibility issues');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
