// Executes the real client effect against synthetic browser/library interfaces.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {load}=require('./security-loader.cjs');
const source=ts.transpileModule(fs.readFileSync('src/components/PublicPerformanceMetrics.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function scenario(start='/publico',enabled=true){
 let path=start,permission=true,imports=0,clean,refIndex=0;const refs=[],callbacks={},sent=[],events=new Map();
 const location={pathname:start,search:''};const browser={addEventListener:(event,fn)=>events.set(event,fn),removeEventListener:(event,fn)=>{if(events.get(event)===fn)events.delete(event);}};
 const exported={};
 const mocks={
  react:{useRef:value=>refs[refIndex++]??(refs[refIndex-1]={current:value}),useEffect:fn=>{clean?.();clean=fn();}},
  'next/navigation':{usePathname:()=>path},
  '@/lib/cookie-consent':{readBrowserConsent:()=>({analytics:permission})},
  '@/lib/performance/public-metrics':load('src/lib/performance/public-metrics.ts'),
  'web-vitals':{onLCP:fn=>callbacks.LCP=fn,onINP:fn=>callbacks.INP=fn,onCLS:fn=>callbacks.CLS=fn},
 };
 vm.runInNewContext(source,{exports:exported,require:name=>{if(name==='web-vitals')imports++;return mocks[name];},window:browser,location,innerWidth:390,AbortController,
  fetch:(url,options)=>{sent.push({url,options});return new Promise(()=>{});},console});
 function render(on){refIndex=0;exported.PublicPerformanceMetrics({enabled:on});}
 render(enabled);await Promise.resolve();await Promise.resolve();
 return {callbacks,sent,location,events,render,get imports(){return imports;},withdraw(){permission=false;events.get('epo:consent-changed')?.();},navigate(next){path=next;location.pathname=next;render(true);},close(){clean?.();}};
}
(async()=>{
 const rejected=await scenario('/publico',false);assert.equal(rejected.imports,0);assert.equal(rejected.sent.length,0);rejected.close();
 const privatePage=await scenario('/alumno',true);assert.equal(privatePage.imports,0);privatePage.navigate('/publico');await Promise.resolve();assert.equal(privatePage.imports,0);privatePage.close();
 const page=await scenario();assert.equal(page.imports,1);
 const metric={name:'LCP',value:3000};Object.defineProperty(metric,'id',{get(){throw Error('Must not inspect metric identifier');}});Object.defineProperty(metric,'entries',{get(){throw Error('Must not inspect DOM attribution');}});
 page.callbacks.LCP(metric);assert.equal(page.sent.length,1);
 assert.equal(page.sent[0].url,'/api/public/metricas');assert.equal(JSON.stringify(JSON.parse(page.sent[0].options.body)),JSON.stringify({route:'/publico',device:'mobile',samples:[{name:'LCP',value:3000}]}));
 page.callbacks.LCP(metric);assert.equal(page.sent.length,1,'More than one sample per metric/document');
 page.withdraw();assert.equal(page.sent[0].options.signal.aborted,true,'Withdrawal did not cancel pending request');
 const unreadable=new Proxy({}, {get(){throw Error('Retired callback inspected a metric');}});
 page.callbacks.INP(unreadable);page.callbacks.CLS(unreadable);assert.equal(page.sent.length,1);page.close();
 const moved=await scenario();moved.location.pathname='/alumno';moved.callbacks.LCP(unreadable);assert.equal(moved.sent.length,0,'Path changed before React effect but private timing sent');moved.navigate('/alumno');moved.navigate('/publico');await Promise.resolve();assert.equal(moved.imports,1,'Metrics restarted after private navigation in same document');moved.close();
 const parameters=await scenario();parameters.location.search='?record=synthetic';parameters.callbacks.LCP(unreadable);assert.equal(parameters.sent.length,0);parameters.close();
 console.log('PASS metrics client: no import without consent/on private load, approved public scalar payload only, no id/DOM reads, one sample/document, withdrawal aborts pending fetch, retired generation never inspects metrics, private/query navigation blocked including return. No network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
