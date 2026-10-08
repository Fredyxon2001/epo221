const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE=process.env.FLOW_BASE_URL||'http://localhost:3003';
const name='epo221-cookie-consent',age=180*24*60*60;
const cookie=(external,savedAt=Date.now()-1000,version=1)=>encodeURIComponent(JSON.stringify({version,external,savedAt}));
(async()=>{
 const browser=await chromium.launch({headless:false});const results=[];
 try{
  const cases=[['fresh',undefined,true],['invalid','%broken',true],['expired',cookie(true,Date.now()-age*1000-1000),true],['old-version',cookie(true,Date.now()-1000,0),true],['future',cookie(true,Date.now()+60000),true],['valid-reject',cookie(false),false],['valid-accept',cookie(true),false]];
  for(const [label,value,banner] of cases){
   const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
   if(value)await ctx.addCookies([{name,value,url:BASE}]);
   const p=await ctx.newPage();const third=[];p.on('request',r=>{if(/google\.com|google\.com\.mx|gstatic/.test(r.url()))third.push(r.url());});
   const res=await p.goto(BASE+'/publico/contacto');assert.equal(res.status(),200);
   assert.equal(await p.locator('#cookie-heading').count(),banner?1:0,label+' noJS banner');
   assert.equal(await p.locator('iframe').count(),0,label+' map gated without JS');
   if(banner)assert.ok(await p.locator('section[aria-labelledby="cookie-heading"] noscript').innerText().then(s=>s.includes('Activa JavaScript')));
   assert.equal(third.length,0,label+' no external requests');await ctx.close();results.push(label+' SSR/noJS PASS');
  }
  async function context(value,init){
   const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
   // This regression tests cookie/map behavior, not persistence of RUM samples.
   await ctx.route('**/api/public/metricas',r=>r.fulfill({status:204}));
   if(value)await ctx.addCookies([{name,value,url:BASE}]);
   const external=[];await ctx.route(/https:\/\/(?:www\.)?(?:maps\.)?google\.com(?:\.mx)?\//,r=>{external.push(r.request().url());return r.abort();});
   if(init)await ctx.addInitScript(init);
   const p=await ctx.newPage();p.setDefaultTimeout(90000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(BASE+'/publico/contacto',{waitUntil:'domcontentloaded',timeout:90000});
   await p.locator('[data-cookie-ready="true"]').waitFor();
   return {ctx,p,external,errors};
  }
  const fresh=await context();await fresh.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();await fresh.p.locator('#cookie-heading').waitFor({state:'hidden'});assert.equal(await fresh.p.locator('iframe').count(),0);const saved=(await fresh.ctx.cookies()).find(c=>c.name===name);assert.equal(JSON.parse(decodeURIComponent(saved.value)).external,false);assert.equal(saved.sameSite,'Lax');assert.equal(saved.path,'/');await fresh.p.reload();assert.equal(await fresh.p.locator('#cookie-heading').count(),0);assert.deepEqual(fresh.errors,[]);await fresh.ctx.close();results.push('fresh reject persists/no map PASS');
  const yes=await context(cookie(true));await yes.p.locator('iframe[title="Ubicación de EPO 221"]').waitFor({state:'attached'});assert.equal(await yes.p.locator('#cookie-heading').count(),0);
  await yes.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await yes.p.locator('#cookie-heading').waitFor({state:'visible'});assert.equal(await yes.p.locator('#cookie-heading').evaluate(el=>el===document.activeElement),true);await yes.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();await yes.p.locator('iframe').waitFor({state:'detached'});assert.equal(await yes.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).evaluate(el=>el===document.activeElement),true);await yes.p.reload();assert.equal(await yes.p.locator('iframe').count(),0);assert.deepEqual(yes.errors,[]);await yes.ctx.close();results.push('valid accept -> withdrawal persists/focus PASS');
  const acceptance=await context();await acceptance.p.getByRole('button',{name:'Aceptar opcionales',exact:true}).click();await acceptance.p.locator('iframe').waitFor({state:'attached'});await acceptance.p.reload();await acceptance.p.locator('iframe').waitFor({state:'attached'});assert.equal(await acceptance.p.locator('#cookie-heading').count(),0);await acceptance.ctx.close();results.push('fresh accept persists/map after client validation PASS');
  const stale=await context(cookie(true),()=>{document.cookie='epo221-cookie-consent=%broken; Path=/; SameSite=Lax';});await stale.p.locator('#cookie-heading').waitFor({state:'visible'});assert.equal(await stale.p.locator('iframe').count(),0);assert.equal(stale.external.length,0);await stale.ctx.close();results.push('SSR accepted but invalidated before hydration stays blocked PASS');
  for(const [label,value] of [['invalid','%broken'],['expired',cookie(true,Date.now()-age*1000-1000)],['valid-reject',cookie(false)]]){
   const test=await context(value);if(label!=='valid-reject')await test.p.locator('#cookie-heading').waitFor({state:'visible'});else await test.p.locator('#cookie-heading').waitFor({state:'hidden'});
   assert.equal(await test.p.locator('iframe').count(),0);assert.equal(test.external.length,0);assert.deepEqual(test.errors,[]);await test.ctx.close();results.push(label+' JS gated PASS');
  }
  const blocked=await context(cookie(true),()=>{
   const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
   window.__blockPreferenceWrites=false;
   Object.defineProperty(document,'cookie',{get(){return descriptor.get.call(document);},set(value){if(!window.__blockPreferenceWrites||!value.startsWith('epo221-cookie-consent='))descriptor.set.call(document,value);}});
   const original=window.setInterval;window.setInterval=function(fn,ms,...args){if(ms===60000)window.__consentTick=()=>fn(...args);return original.call(window,fn,ms,...args);};
  });
  await blocked.p.locator('iframe').waitFor({state:'attached'});await blocked.p.evaluate(()=>{window.__blockPreferenceWrites=true;});
  await blocked.p.getByRole('button',{name:'Preferencias de cookies',exact:true}).click();await blocked.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();await blocked.p.locator('iframe').waitFor({state:'detached'});await blocked.p.getByRole('status').filter({hasText:'no pudo guardar'}).waitFor();assert.equal(JSON.parse(decodeURIComponent((await blocked.ctx.cookies()).find(c=>c.name===name).value)).external,true,'setter left old accepted value untouched');
  await blocked.p.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.__consentTick();});assert.equal(await blocked.p.locator('iframe').count(),0);
  await blocked.p.evaluate(()=>{window.__blockPreferenceWrites=false;});await blocked.p.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();await blocked.p.locator('#cookie-heading').waitFor({state:'hidden'});assert.equal(JSON.parse(decodeURIComponent((await blocked.ctx.cookies()).find(c=>c.name===name).value)).external,false);assert.deepEqual(blocked.errors,[]);await blocked.ctx.close();results.push('blocked withdrawal rejects old acceptance, focus/timer stay blocked; retry saves PASS');
  console.log(JSON.stringify({base:BASE,results,dbMutations:0},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
