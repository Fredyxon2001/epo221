// Every metric POST is intercepted before the server. No production DB writes.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {load}=require('./security-loader.cjs');
const {parsePublicMetricPayload}=load('src/lib/performance/public-metrics.ts');
const base=process.env.FLOW_BASE_URL||'http://localhost:3004',cookieName='epo221-cookie-consent';
const encode=data=>encodeURIComponent(JSON.stringify(data));
(async()=>{
 const browser=await chromium.launch({headless:false});const results=[];
 const phase=name=>console.log('Checking '+name);
 async function page(cookie,blocked=false){
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),samples=[];
  if(cookie)await ctx.addCookies([{name:cookieName,value:encode(cookie),url:base}]);
  await ctx.route(url=>url.origin!==new URL(base).origin,route=>route.abort());
  await ctx.route('**/api/public/metricas',route=>{
   const payload=JSON.parse(route.request().postData());assert.ok(parsePublicMetricPayload(payload));samples.push(payload);
   return route.fulfill({status:204});
  });
  if(blocked)await ctx.addInitScript(()=>{
   const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');window.__blockPreferenceWrites=false;
   Object.defineProperty(document,'cookie',{get(){return descriptor.get.call(document);},set(value){if(!window.__blockPreferenceWrites||!value.startsWith('epo221-cookie-consent='))descriptor.set.call(document,value);}});
   const interval=window.setInterval;window.setInterval=function(fn,ms,...args){if(ms===60000)window.__consentTick=()=>fn(...args);return interval.call(window,fn,ms,...args);};
  });
  const p=await ctx.newPage();p.setDefaultTimeout(90000);let errors=0;p.on('pageerror',()=>errors++);
  await p.goto(base+'/publico/contacto',{waitUntil:'domcontentloaded',timeout:90000});await p.locator('[data-cookie-ready="true"]').waitFor();
  return {ctx,p,samples,get errors(){return errors;}};
 }
 async function settle(p){await p.waitForTimeout(1200);await p.keyboard.press('Tab');await p.waitForTimeout(1000);}
 async function stored(ctx){return JSON.parse(decodeURIComponent((await ctx.cookies()).find(c=>c.name===cookieName).value));}
 try{
  for(const [name,cookie] of [['legacy-map-only',{version:1,external:false,savedAt:Date.now()-1000}],['valid-reject',{version:2,external:false,analytics:false,savedAt:Date.now()-1000}],['expired',{version:2,external:false,analytics:true,savedAt:Date.now()-181*86400000}]]){
   phase(name);const test=await page(cookie);await settle(test.p);assert.equal(test.samples.length,0,name+' sent analytics');assert.equal(test.errors,0);await test.ctx.close();results.push(name+' no metrics PASS');
  }
  phase('map-only');const map=await page();await map.p.getByRole('button',{name:'Configurar',exact:true}).click();
  await map.p.getByRole('checkbox',{name:'Permitir el mapa de Google y sus cookies de terceros',exact:true}).check();
  assert.equal(await map.p.getByRole('checkbox',{name:'Permitir medición propia del rendimiento de páginas públicas',exact:true}).isChecked(),false);
  await map.p.getByRole('button',{name:'Guardar preferencias',exact:true}).click();await settle(map.p);
  assert.equal((await stored(map.ctx)).analytics,false);assert.equal(map.samples.length,0);assert.equal(map.errors,0);await map.ctx.close();results.push('map-only no metrics PASS');
  phase('analytics-only');const yes=await page();await yes.p.getByRole('button',{name:'Configurar',exact:true}).click();
  await yes.p.getByRole('checkbox',{name:'Permitir medición propia del rendimiento de páginas públicas',exact:true}).check();await yes.p.getByRole('button',{name:'Guardar preferencias',exact:true}).click();
  await settle(yes.p);await yes.p.waitForFunction(()=>document.cookie.includes('epo221-cookie-consent='));
  for(let i=0;i<12&&yes.samples.length===0;i++)await yes.p.waitForTimeout(500);
  assert.ok(yes.samples.length>0,'Official web-vitals produced no LCP measurement after consent/interaction');
  assert.equal((await stored(yes.ctx)).external,false);assert.equal((await stored(yes.ctx)).analytics,true);assert.equal(await yes.p.locator('iframe').count(),0);
  await yes.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await yes.p.getByRole('button',{name:'Cerrar',exact:true}).click();
  await yes.p.waitForTimeout(700);await yes.p.evaluate(()=>{const sample=document.createElement('div');sample.style.height='160px';document.querySelector('main').prepend(sample);});await yes.p.waitForTimeout(700);
 phase('real background finalization');const hidden=await yes.ctx.newPage();await hidden.goto('about:blank');await hidden.bringToFront();
  const backgrounded=await yes.p.waitForFunction(()=>document.visibilityState==='hidden',null,{polling:100,timeout:2000}).then(()=>true,error=>{if(error.name==='TimeoutError')return false;throw error;});
  await yes.p.waitForTimeout(1200);await yes.p.bringToFront();await hidden.close();
  const names=[...new Set(yes.samples.flatMap(payload=>payload.samples.map(sample=>sample.name)))];
  assert.ok(names.includes('LCP'),'Official LCP was not observed');
  if(backgrounded)assert.equal(names.length,3,'Official browser LCP/INP/CLS not all observed: '+names.join(','));
  else results.push('Browser keeps both tabs visible: native INP/CLS finalization pending; observed '+names.join(','));
  phase('withdrawal');await yes.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await yes.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();
  const acceptedCount=yes.samples.length;await yes.p.evaluate(()=>{const block=document.createElement('div');block.style.height='170px';document.body.prepend(block);window.dispatchEvent(new Event('focus'));});await settle(yes.p);assert.equal(yes.samples.length,acceptedCount,'Withdrawal allowed a new send');
  await yes.p.reload();await settle(yes.p);assert.equal(yes.samples.length,acceptedCount,'Rejected consent sent after reload');assert.equal(yes.errors,0);await yes.ctx.close();results.push('analytics-only official scalar POSTs; withdrawal/reload stops sends PASS');
  phase('blocked storage withdrawal');const blocked=await page({version:2,external:false,analytics:true,savedAt:Date.now()-1000},true);await settle(blocked.p);
  await blocked.p.evaluate(()=>{window.__blockPreferenceWrites=true;});await blocked.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await blocked.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();
  await blocked.p.getByRole('status').filter({hasText:'no pudo guardar'}).waitFor();const before=blocked.samples.length;assert.equal((await stored(blocked.ctx)).analytics,true);
  await blocked.p.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.__consentTick();});await settle(blocked.p);assert.equal(blocked.samples.length,before,'Blocked storage reactivated old analytics acceptance');assert.equal(blocked.errors,0);await blocked.ctx.close();results.push('blocked withdrawal + focus/timer remain blocked PASS');
  console.log(JSON.stringify({base,results,metricRequestsIntercepted:true,dbMutations:0,thirdPartyRequestsBlocked:true},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
