// Synthetic inactive cycle and publications only. Never persists credentials.
if(!process.argv.includes('--live'))throw Error('Requires --live');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const{chromium}=require('playwright');const{createFixtures}=require('./flow-fixtures.cjs');
const f=createFixtures(),base=process.env.FLOW_BASE_URL??'http://localhost:3002';let browser;
async function main(){try{
 const actor=await f.account('admin');await f.enroll(actor);
 const cycle=await f.row('ciclos_escolares',{codigo:'FLOW-GUIDE-'+Date.now(),periodo:'Verification',activo:false});
 browser=await chromium.launch({headless:false});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([...actor.cookies.values()].map(c=>({name:c.name,value:c.value,url:base})));
 const page=await context.newPage();page.setDefaultTimeout(60000);
 async function save(){await Promise.all([page.waitForResponse(r=>r.request().method()==='POST' && r.url().includes('/admin/publico/guias')),page.getByRole('button',{name:'Guardar guía',exact:true}).click()]);await page.getByText('Guía guardada.',{exact:true}).waitFor();}
 await page.goto(base+'/admin/publico/guias?ciclo='+cycle);
 const consent=page.getByRole('button',{name:/rechazar opcionales/i});await consent.waitFor({state:'visible'});await consent.click();
 await page.locator('input[name="titulo"]').fill('Prueba técnica · no es convocatoria');
 for(const name of ['requisitos','fechas','preguntas'])await page.locator('textarea[name="'+name+'"]').fill('Información sintética '+name+' <img src=x onerror=alert(1)>');
 await save();
 await page.getByText('Guía guardada.',{exact:true}).waitFor();
 f.cleanups.push(async()=>{const r=await f.admin.from('guias_escolares').delete().eq('ciclo_id',cycle);if(r.error)throw Error('Guide cleanup failed');});
 let api=await fetch(base+'/api/public/guides?ciclo='+cycle);let data=await api.json();
 assert.ok(!JSON.stringify(data).includes('Información sintética'),'Draft exposed');
 await page.locator('input[name="publicada"]').check();await save();
 await page.getByText('Guía guardada.',{exact:true}).waitFor();
 api=await fetch(base+'/api/public/guides?ciclo='+cycle);data=await api.json();assert.ok(JSON.stringify(data).includes('Información sintética'),'Published mobile guide missing');
 const publicPage=await browser.newPage({viewport:{width:390,height:844}});
 await publicPage.goto(base+'/publico/guia?ciclo='+cycle);
 await publicPage.getByText('Prueba técnica · no es convocatoria',{exact:true}).waitFor();
 assert.equal(await publicPage.locator('img[src="x"]').count(),0,'Guide executed HTML');
 await page.locator('input[name="publicada"]').uncheck();await save();await page.getByText('Guía guardada.',{exact:true}).waitFor();
 console.log('PASS admin guide GUI at 390px: save draft, publish to web/mobile API, escape HTML, unpublish.');
 for(const [table,field,path] of [['noticias','publicada','noticias'],['albumes','publicado','albumes'],['paginas_publicas','publicada','p']]){
   const slug='flow-seo-'+crypto.randomUUID(),title='Prueba técnica de índice · no es aviso escolar';
   const id=await f.row(table,{slug,titulo:title,[field]:false});
   let response=await fetch(base+'/sitemap.xml'),xml=await response.text();assert.equal(response.status,200);assert.ok(!xml.includes(slug),'Draft in sitemap');
   let detail=await fetch(base+'/publico/'+path+'/'+slug);let html=await detail.text();assert.ok(html.includes('noindex'),'Draft indexed');
   const pub=await f.admin.from(table).update({[field]:true}).eq('id',id).select('updated_at').single();assert.ok(!pub.error);
   xml=await(await fetch(base+'/sitemap.xml')).text();assert.ok(xml.includes('/publico/'+path+'/'+slug),'Published content missing sitemap');assert.ok(xml.includes(pub.data.updated_at.replace('+00:00','Z').replace(/\.\d+Z$/,'Z').slice(0,19)),'Missing real modification timestamp');
   detail=await fetch(base+'/publico/'+path+'/'+slug);html=await detail.text();assert.equal(detail.status,200);assert.ok(html.includes('rel="canonical" href="https://epo221.edu.mx/publico/'+path+'/'+slug+'"'),'Missing canonical');assert.ok(html.includes('property="article:modified_time"'),'Missing modified metadata');
   const removed=await f.admin.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);assert.ok(!removed.error);
   xml=await(await fetch(base+'/sitemap.xml')).text();assert.ok(!xml.includes(slug),'Deleted content indexed');
   html=await(await fetch(base+'/publico/'+path+'/'+slug)).text();assert.ok(html.includes('noindex'),'Deleted content indexable');
 }
 console.log('PASS news, albums and CMS pages: drafts/deletions excluded; published URLs, true timestamps and canonical/article metadata; no private URLs.');
}finally{if(browser)await browser.close();await f.cleanup();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
