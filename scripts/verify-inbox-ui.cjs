if(!process.argv.includes('--live'))throw Error('Requires --live');
const assert=require('node:assert/strict');const{chromium}=require('playwright');const{createFixtures}=require('./flow-fixtures.cjs');
const f=createFixtures(),base=process.env.FLOW_BASE_URL??'http://localhost:3002';let browser;
(async()=>{try{
 browser=await chromium.launch({headless:false});
 const requested=process.argv.find(a=>a.startsWith('--role='))?.slice(7);
 for(const role of ['alumno','profesor','admin','staff','director','finanzas'].filter(r=>!requested||r===requested)){
   const a=await f.account(role,79);if(['admin','staff','director','finanzas'].includes(role))await f.enroll(a);
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
   await context.addCookies([...a.cookies.values()].map(c=>({name:c.name,value:c.value,url:base})));
   const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const path=['admin','staff','finanzas'].includes(role)?'admin':role;await page.goto(base+'/'+path+'/pendientes');
   await page.getByRole('heading',{name:'Bandeja de pendientes',exact:true}).waitFor();
   const consent=page.getByRole('button',{name:/rechazar opcionales/i});await consent.waitFor({state:'visible'});await consent.click();
   const aside=page.locator('aside');assert.ok(await aside.getAttribute('inert')!==null,'Hidden sidebar remains keyboard accessible');
   await page.getByRole('button',{name:'Abrir menú',exact:true}).click();assert.equal(await aside.getAttribute('aria-modal'),'true');
   await page.keyboard.press('Escape');assert.ok(await aside.getAttribute('inert')!==null);assert.equal(await page.getByRole('button',{name:'Abrir menú',exact:true}).evaluate(e=>e===document.activeElement),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Inbox overflow');
   assert.deepEqual(errors,[]);console.log('PASS 390px inbox '+role+': authenticated page, hidden-menu inert, modal focus/Escape/restoration, no overflow/runtime error');await context.close();
 }
}finally{if(browser)await browser.close();await f.cleanup();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
