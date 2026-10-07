const assert=require('node:assert/strict');const{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:false});try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.FLOW_BASE_URL??'http://localhost:3002')+'/publico');
 const consent=page.getByRole('button',{name:/rechazar opcionales/i});if(await consent.isVisible())await consent.click();await page.reload();
 await page.keyboard.press('Tab');await page.getByRole('link',{name:'Saltar al contenido'}).waitFor({state:'visible'});
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.id),'contenido-publico');
 await page.getByRole('button',{name:'Menú',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Menú',exact:true}).getAttribute('aria-expanded'),'true');
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Menú',exact:true}).getAttribute('aria-expanded'),'false');
 const logo=page.locator('img[fetchpriority="high"]').first();assert.ok((await logo.getAttribute('src')).startsWith('/_next/image'));
 await page.evaluate(()=>{document.documentElement.style.fontSize='32px';});await page.waitForTimeout(500);
 const hero=await page.locator('main section').first().boundingBox();const heading=await page.locator('main h1').first().boundingBox();
 assert.ok(heading && hero && heading.y+heading.height<=hero.y+hero.height,'Hero clips enlarged title');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page has horizontal overflow');
 assert.equal(await page.locator('.custom-cursor').evaluate(el=>getComputedStyle(el).display),'none');
 assert.deepEqual(errors,[]);
 const plain=await browser.newPage({javaScriptEnabled:false,viewport:{width:1440,height:900}});await plain.goto((process.env.FLOW_BASE_URL??'http://localhost:3002')+'/publico');await plain.getByRole('heading',{level:1}).waitFor();await plain.getByRole('link',{name:/Explora nuestra oferta/}).waitFor();console.log('PASS public desktop 1440px with JavaScript disabled: title and actions rendered.');
 console.log('PASS public mobile 390px: keyboard skip/focus; menu Escape; high-priority optimized logo; 200% text without clipping/overflow; reduced motion; no runtime errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
