// Metric POSTs terminate in a bounded loopback HTTP proxy, including unload keepalive. No DB writes.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const {load}=require('./security-loader.cjs');
const {parsePublicMetricPayload}=load('src/lib/performance/public-metrics.ts');
const {startMetricsProxy}=require('./metrics-consent-proxy.cjs');
const upstream=process.env.FLOW_BASE_URL||'http://127.0.0.1:3004',cookieName='epo221-cookie-consent';
const target=new URL(upstream);
assert.ok(target.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(target.hostname) && target.pathname==='/' && !target.search && !target.hash && !target.username && !target.password,'Full consent lifecycle probe requires an explicit HTTP loopback origin; published HTTPS uses a separate direct smoke test.');
const encode=data=>encodeURIComponent(JSON.stringify(data));
(async()=>{
 const browser=await chromium.launch({headless:false});const results=[],proxies=[];
 const phase=name=>console.log('Checking '+name);
 async function page(cookie,blocked=false){
  const samples=[],mode='forward';
  const proxy=await startMetricsProxy(upstream,payload=>{assert.ok(parsePublicMetricPayload(payload));samples.push(payload);},{mode});proxies.push(proxy);
  const base=upstream;
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',proxy:{server:proxy.base,bypass:'<-loopback>'}});
  if(cookie)await ctx.addCookies([{name:cookieName,value:encode(cookie),url:base}]);
  await ctx.route('**/*',route=>{
   const request=route.request();
   if(new URL(request.url()).origin!==new URL(base).origin || (!['GET','HEAD'].includes(request.method()) && !(request.method()==='POST' && new URL(request.url()).pathname==='/api/public/metricas')))return route.abort();
   return route.continue();
  });
  if(blocked)await ctx.addInitScript(()=>{
   const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');window.__blockPreferenceWrites=false;
   Object.defineProperty(document,'cookie',{get(){return descriptor.get.call(document);},set(value){if(!window.__blockPreferenceWrites||!value.startsWith('epo221-cookie-consent='))descriptor.set.call(document,value);}});
   const interval=window.setInterval;window.setInterval=function(fn,ms,...args){if(ms===60000)window.__consentTick=()=>fn(...args);return interval.call(window,fn,ms,...args);};
  });
  await ctx.addInitScript(()=>document.addEventListener('visibilitychange',event=>{if(event.isTrusted && document.visibilityState==='hidden')console.log('epo-metrics-native-hidden');}));
  const p=await ctx.newPage();p.setDefaultTimeout(90000);let errors=0,hiddenEvents=0;p.on('pageerror',()=>errors++);p.on('console',message=>{if(message.text()==='epo-metrics-native-hidden')hiddenEvents++;});
  await p.goto(base+'/publico/contacto',{waitUntil:'domcontentloaded',timeout:90000});await p.locator('[data-cookie-ready="true"]').waitFor();
  return {ctx,p,samples,proxy,get errors(){return errors;},get hiddenEvents(){return hiddenEvents;}};
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
  phase('verified analytics true-to-true save');
  const firstSaved=(await stored(yes.ctx)).savedAt;
  await yes.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();
  await yes.p.getByRole('button',{name:'Guardar preferencias',exact:true}).click();await settle(yes.p);
  assert.equal((await stored(yes.ctx)).analytics,true);assert.ok((await stored(yes.ctx)).savedAt>firstSaved);
  assert.equal(yes.samples.flatMap(p=>p.samples).filter(s=>s.name==='LCP').length,1,'Same-document save duplicated LCP');
  // Reload creates a trusted native hidden transition. Capture at HTTP level,
  // independent of Playwright's routing lifetime for the destroyed document.
  phase('real document navigation finalization');const hiddenBefore=yes.hiddenEvents;
  await yes.p.reload({waitUntil:'domcontentloaded'});await yes.p.locator('[data-cookie-ready="true"]').waitFor();
  const metricNames=()=>[...new Set(yes.samples.flatMap(payload=>payload.samples.map(sample=>sample.name)))].sort();
  for(let n=0;n<40&&metricNames().length<3;n++)await new Promise(resolve=>setTimeout(resolve,250));
  assert.deepEqual(metricNames(),['CLS','INP','LCP'],'Official native metrics not all observed');
  assert.equal(yes.samples.length,3,'Outgoing document should send one scalar per metric');
  assert.ok(yes.hiddenEvents>hiddenBefore,'Native hidden lifecycle event was not observed');
  results.push('Official LCP/INP/CLS; verified true-to-true save resumes pending metrics without duplicate LCP; normal navigation PASS');
  phase('withdrawal');await yes.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await settle(yes.p);await yes.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();
  const acceptedCount=yes.samples.length;await yes.p.evaluate(()=>{const block=document.createElement('div');block.style.height='170px';document.body.prepend(block);window.dispatchEvent(new Event('focus'));});await settle(yes.p);assert.equal(yes.samples.length,acceptedCount,'Withdrawal allowed a new send');
  await yes.p.reload();await settle(yes.p);assert.equal(yes.samples.length,acceptedCount,'Rejected consent sent after reload');assert.equal(yes.errors,0);await yes.ctx.close();results.push('analytics-only official scalar POSTs; withdrawal/reload stops sends PASS');
  phase('blocked storage withdrawal');const blocked=await page({version:2,external:false,analytics:true,savedAt:Date.now()-1000},true);await settle(blocked.p);
  await blocked.p.evaluate(()=>{window.__blockPreferenceWrites=true;});await blocked.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await blocked.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();
  await blocked.p.getByRole('status').filter({hasText:'no pudo guardar'}).waitFor();const before=blocked.samples.length;assert.equal((await stored(blocked.ctx)).analytics,true);
  await blocked.p.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.__consentTick();});await settle(blocked.p);assert.equal(blocked.samples.length,before,'Blocked storage reactivated old analytics acceptance');assert.equal(blocked.errors,0);await blocked.ctx.close();results.push('blocked withdrawal + focus/timer remain blocked PASS');
  console.log(JSON.stringify({upstream,results,metricRequestsCapturedLocally:true,dbMutations:0,thirdPartyRequestsBlocked:true},null,2));
 }finally{await browser.close();await Promise.all(proxies.map(proxy=>proxy.close()));}
})().catch(error=>{console.error(error);process.exitCode=1;});
