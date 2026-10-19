// Explicit anonymous public origin. No fixtures; mutations and third-party requests aborted.
'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const {targetOrigin,limitedBody}=require('./audit.cjs');
const variants=require('../../src/lib/public-derived-documents.json'),proof=require('./derived-pdfs-proof.json');
(async()=>{
  if(process.argv.length!==3)throw Error('Explicit public origin required');
  const base=targetOrigin(process.argv[2]),browser=await chromium.launch({headless:false});
  let blockedMutations=0;
  try{
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
      await context.addCookies([{name:'epo221-cookie-consent',value:encodeURIComponent(JSON.stringify({version:2,external:false,analytics:false,savedAt:Date.now()-1000})),url:base}]);
      await context.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(!['GET','HEAD'].includes(request.method())){blockedMutations++;return route.abort('blockedbyclient');}
        if(url.origin!==base)return route.abort('blockedbyclient');
        return route.continue();
      });
      const page=await context.newPage();let errors=0;page.on('pageerror',()=>errors++);
      const response=await page.goto(base+'/publico/descargas',{waitUntil:'domcontentloaded',timeout:90000});assert.equal(response.status(),200);
      for(const variant of variants){
        const original=page.locator('a[href="'+variant.source+'"]');assert.equal(await original.count(),1);
        const link=page.getByRole('link',{name:'Descargar '+variant.title+': PDF con título de documento',exact:true});
        assert.equal(await link.getAttribute('href'),variant.download);assert.ok(await link.isVisible());
        const box=await link.boundingBox();assert.ok(box.height>=44&&box.width>=44);
      }
      assert.equal(await page.getByText(/Copia del archivo histórico con el título añadido/).count(),4);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      assert.equal(axe.violations.length,0,'Selected public document axe rules failed');assert.equal(errors,0);
      await context.close();console.log('PASS title-only public PDF links at '+width+'px: original links retained, labels/touch targets/axe/no overflow/no runtime errors.');
    }
    for(const [i,variant] of variants.entries()){
      const response=await fetch(base+variant.download,{redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(15000)});
      assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/^application\/pdf(?:;|$)/);
      const bytes=await limitedBody(response,4*1024*1024);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),proof.derived[i].derivedSha256);
    }
    assert.equal(blockedMutations,0,'Public route attempted a mutation despite rejected consent');
    console.log('PASS four served derived PDF bytes/hash; no DB mutation or third-party request forwarded.');
  }finally{await browser.close();}
})().catch(error=>{console.error('Public document browser check failed: '+error.message);process.exitCode=1;});
