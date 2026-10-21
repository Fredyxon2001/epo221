'use strict';
// Disposable loopback stack only. No personal records, hosted writes or login.
require('./assert-isolated.cjs').assertIsolatedEnvironment();
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const {createFixtures}=require('./flow-fixtures.cjs'),readings=require('../src/lib/public-document-readings.json');
const base=process.env.FLOW_BASE_URL,f=createFixtures();let browser;
(async()=>{const saved=[];try{
 f.cleanups.push(async()=>{for(const row of saved){const r=await f.admin.from('documentos_publicos').update({publicada:row.publicada}).eq('id',row.id);assert.ifError(r.error);}});
 // The isolated schema seeds these historical rows. Temporarily withdraw ONLY
 // their local copies; restore their exact flag even when a browser assertion fails.
 for(const item of readings){const q=await f.admin.from('documentos_publicos').select('id,publicada').eq('pdf_url',item.sourcePdf).eq('docx_url',item.sourceDocx).eq('titulo',item.title);assert.ifError(q.error);saved.push(...q.data);for(const row of q.data){const r=await f.admin.from('documentos_publicos').update({publicada:false}).eq('id',row.id);assert.ifError(r.error);}}
 const ids=[];for(const item of readings)ids.push(await f.row('documentos_publicos',{titulo:item.title,audiencia:'general',version:'Lectura histórica · prueba aislada',vigente:false,publicada:true,pdf_url:item.sourcePdf,docx_url:item.sourceDocx}));
 browser=await chromium.launch({headless:true,channel:'chrome'});let checks=0;
 for(const width of [320,390,1440]){const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await ctx.addCookies([{name:'epo221-cookie-consent',value:encodeURIComponent(JSON.stringify({version:2,external:false,analytics:false,savedAt:Date.now()-1000})),url:base}]);const p=await ctx.newPage();p.setDefaultTimeout(90000);let writes=0,errors=0;
 await p.route('**/*',route=>{const r=route.request(),u=new URL(r.url());assert.equal(u.origin,new URL(base).origin,'Unexpected browser destination');assert.ok(['GET','HEAD'].includes(r.method()),'Public reader must not send mutations');return route.continue();});p.on('pageerror',()=>errors++);p.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes++;});
 const catalog=await p.goto(base+'/publico/descargas',{waitUntil:'networkidle',timeout:120000});assert.equal(catalog.status(),200);assert.equal(await p.locator('a[href^="/publico/descargas/lectura/"]').count(),2);
 for(const item of readings){const response=await p.goto(base+'/publico/descargas/lectura/'+item.slug,{waitUntil:'networkidle',timeout:120000});assert.equal(response.status(),200);assert.equal(await p.locator('h1').count(),1);assert.equal(await p.locator('article p,article li,article h2').count(),item.blocks.length);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
 const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[],'Reader axe violations');
 const link=p.getByRole('navigation',{name:'Secciones del documento',exact:true}).getByRole('link').first();const target=await link.getAttribute('href');await link.focus();await p.keyboard.press('Enter');await p.waitForFunction(id=>document.activeElement?.id===id,target.slice(1));
 await p.evaluate(()=>{document.documentElement.style.zoom='2';});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow at 200% zoom');await p.evaluate(()=>{document.documentElement.style.zoom='';});checks++;}
 assert.equal(writes,0);assert.equal(errors,0);await ctx.close();}
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),p=await nojs.newPage();for(const item of readings){const r=await p.goto(base+'/publico/descargas/lectura/'+item.slug);assert.equal(r.status(),200);assert.equal(await p.locator('article p,article li,article h2').count(),item.blocks.length);}await nojs.close();
 const ctx=await browser.newContext({javaScriptEnabled:false}),gate=await ctx.newPage();await f.admin.from('documentos_publicos').update({publicada:false}).eq('id',ids[0]);assert.equal((await gate.goto(base+'/publico/descargas/lectura/'+readings[0].slug)).status(),404);await f.admin.from('documentos_publicos').update({publicada:true,docx_url:'/descargas/changed.docx'}).eq('id',ids[0]);assert.equal((await gate.goto(base+'/publico/descargas/lectura/'+readings[0].slug)).status(),404);assert.equal((await gate.goto(base+'/publico/descargas/lectura/unknown')).status(),404);await ctx.close();
 console.log(JSON.stringify({ok:true,readers:2,widths:[320,390,1440],renderChecks:checks,axeViolations:0,noJavaScript:true,zoom200:true,keyboardAnchors:true,withdrawnAndReplaced404:true,sourceParagraphs:107,productionWrites:0,screenReaderCertified:false}));
 }finally{await browser?.close();await f.cleanup();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
