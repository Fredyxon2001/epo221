// Unit simulation of the real provider/effect, not browser Web Vitals evidence.
// Browser/library/cookie interfaces below are synthetic; no DOM, network or DB.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {load}=require('./security-loader.cjs');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const collectorSource=compile('src/components/PublicPerformanceMetrics.tsx');
const providerSource=compile('src/components/CookieConsentProvider.tsx');
const definitions=load('src/lib/cookie-consent.ts');
const allowed=()=>({version:2,external:false,analytics:true,savedAt:Date.now()-1000});
const drain=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};

// Minimal hook driver: preserve refs/state, compare effect dependencies, run
// cleanup before replacement, and explicitly commit effects after each render.
function hooks(){
 const slots=[];let index=0,pending=[],dirty=false,mounted=true;
 const api={
  useRef(value){const i=index++;return slots[i]??(slots[i]={current:value});},
  useState(initial){const i=index++;slots[i]??={value:typeof initial==='function'?initial():initial};
   return [slots[i].value,next=>{if(!mounted)return;const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
  useEffect(fn,deps){const i=index++,previous=slots[i];if(!previous||deps.some((value,j)=>!Object.is(value,previous.deps[j])))pending.push({i,fn,deps});},
  createContext:value=>({Provider:'SyntheticContextProvider',value}),useContext:context=>context.value,
 };
 return {api,render(fn){index=0;dirty=false;return fn();},commit(){const effects=pending;pending=[];for(const e of effects)slots[e.i]?.clean?.();for(const e of effects)slots[e.i]={deps:e.deps,clean:e.fn()};},
  get dirty(){return dirty;},close(){mounted=false;for(const slot of slots)slot?.clean?.();pending=[];}};
}
async function scenario({start='/publico',consent=allowed(),provider=false,autoDrain=true}={}){
 let path=start,imports=0,tree,props={enabled:consent?.analytics===true,revision:0},cookie=consent,blocked=false,beforeWrite=()=>{};
 const events=new Map(),timers=new Set(),sent=[],generations=[],metricHooks=hooks(),providerHooks=hooks();
 const location={pathname:start,search:'',protocol:'https:'};
 const browser={
  addEventListener(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},
  removeEventListener(type,fn){events.get(type)?.delete(fn);},
  dispatchEvent(event){for(const fn of [...(events.get(event.type)||[])])fn(event);return true;},
  setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);},
 };
 const document={};
 Object.defineProperty(document,'cookie',{set(value){beforeWrite();if(!blocked)cookie=definitions.parseConsent(value.split(';')[0].split('=').slice(1).join('='));}});
 const jsx=(type,props)=>({type,props:props||{}}),metricExports={},providerExports={};
 const shared={
  'next/navigation':{usePathname:()=>path},'next/link':{default:'SyntheticLink'},
  'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'SyntheticFragment'},
  '@/lib/cookie-consent':{...definitions,readBrowserConsent:()=>cookie},
  '@/lib/performance/public-metrics':load('src/lib/performance/public-metrics.ts'),
  'web-vitals':{onLCP:fn=>generations.at(-1).LCP=fn,onINP:fn=>generations.at(-1).INP=fn,onCLS:fn=>generations.at(-1).CLS=fn},
 };
 const globals={window:browser,document,location,innerWidth:390,AbortController,Event,console,
  fetch:(url,options)=>{sent.push({url,options});return new Promise(()=>{});}};
 vm.runInNewContext(collectorSource,{...globals,exports:metricExports,require:name=>{
  if(name==='react')return metricHooks.api;
  if(name==='web-vitals'){imports++;generations.push({});}
  assert.ok(Object.hasOwn(shared,name),'Unexpected mock dependency '+name);return shared[name];
 }});
 shared['@/components/PublicPerformanceMetrics']=metricExports;
 vm.runInNewContext(providerSource,{...globals,exports:providerExports,require:name=>name==='react'?providerHooks.api:shared[name]});
 function nodes(node,match,result=[]){
  if(Array.isArray(node)){node.forEach(child=>nodes(child,match,result));return result;}
  if(!node||typeof node!=='object')return result;
  if(match(node))result.push(node);nodes(node.props?.children,match,result);return result;
 }
 function flush(){
  for(let i=0;i<20;i++){
   if(provider){tree=providerHooks.render(()=>providerExports.CookieConsentProvider({children:null,initialConsent:consent}));props=nodes(tree,n=>n.type===metricExports.PublicPerformanceMetrics)[0].props;}
   metricHooks.render(()=>metricExports.PublicPerformanceMetrics(props));
   if(provider)providerHooks.commit();metricHooks.commit();
   if(!providerHooks.dirty&&!metricHooks.dirty)return;
  }
  throw Error('Hook simulation failed to settle');
 }
 flush();if(autoDrain)await drain();
 const api={
  sent,generations,location,flush,
  get imports(){return imports;},get props(){return props;},get cookie(){return cookie;},
  get callbacks(){return generations.at(-1);},
  emit(type){browser.dispatchEvent(new Event(type));flush();},
  tick(){for(const fn of [...timers])fn();flush();},
  writeGuard(fn){beforeWrite=fn;},blockWrites(){blocked=true;},
  button(label){const node=nodes(tree,n=>n.type==='button'&&n.props.children===label)[0];assert.ok(node,'Button missing: '+label);node.props.onClick();flush();},
  check(label,value){const node=nodes(tree,n=>n.type==='label'&&n.props.children.some?.(child=>typeof child==='string'&&child.trim()===label))[0];assert.ok(node,'Checkbox missing: '+label);node.props.children.find(child=>child?.type==='input').props.onChange({target:{checked:value}});flush();},
  setConsent(value){cookie=value;},
  withdraw(){cookie=null;browser.dispatchEvent(new Event('epo:consent-changed'));},
  render(enabled,revision=props.revision){props={enabled,revision};flush();},
  navigate(next){path=next;location.pathname=next;flush();},
  close(){providerHooks.close();metricHooks.close();},
 };
 return api;
}
const unreadable=new Proxy({},{get(){throw Error('Retired callback inspected synthetic metric');}});
const report=(page,name,value)=>page.callbacks[name]({name,value});
(async()=>{
 const rejected=await scenario({consent:null});assert.equal(rejected.imports,0);rejected.close();
 const privatePage=await scenario({start:'/alumno'});assert.equal(privatePage.imports,0);privatePage.navigate('/publico');await drain();assert.equal(privatePage.imports,0);privatePage.close();
 const page=await scenario();assert.equal(page.imports,1);
 const metric={name:'LCP',value:3000};for(const key of ['id','entries','attribution','navigationURL'])Object.defineProperty(metric,key,{get(){throw Error('Must not inspect '+key);}});
 page.callbacks.LCP(metric);assert.equal(page.sent.length,1);
 assert.equal(page.sent[0].url,'/api/public/metricas');assert.equal(JSON.stringify(JSON.parse(page.sent[0].options.body)),JSON.stringify({route:'/publico',device:'mobile',samples:[{name:'LCP',value:3000}]}));
 page.callbacks.LCP(metric);assert.equal(page.sent.length,1);page.render(true);await drain();assert.equal(page.imports,1,'Same dependencies restarted observer');
 page.withdraw();assert.equal(page.sent[0].options.signal.aborted,true);page.callbacks.INP(unreadable);page.callbacks.CLS(unreadable);assert.equal(page.sent.length,1);page.close();

 // Real JSX event handlers run against a synthetic cookie interface. Verify
 // invalidation at the moment writing starts, before any state effect commits.
 const saved=await scenario({provider:true});report(saved,'LCP',3000);const old=saved.callbacks;
 saved.writeGuard(()=>{assert.equal(saved.sent[0].options.signal.aborted,true,'Save did not invalidate before cookie write');old.INP(unreadable);});
 saved.button('Preferencias de cookies');saved.button('Guardar preferencias');await drain();
 assert.equal(saved.props.enabled,true);assert.equal(saved.props.revision,1);assert.equal(saved.imports,2,'true -> true did not rearm');
 old.CLS(unreadable);report(saved,'LCP',4000);assert.equal(saved.sent.length,1,'New generation duplicated LCP');
 report(saved,'INP',100);report(saved,'CLS',0);assert.equal(saved.sent.length,3,'Pending metrics not resumed');
 saved.emit('focus');saved.tick();await drain();assert.equal(saved.imports,2,'Unchanged focus/timer consent restarted observer');
 saved.button('Preferencias de cookies');saved.button('Rechazar opcionales');await drain();
 assert.equal(saved.props.enabled,false);assert.ok(saved.sent.every(request=>request.options.signal.aborted),'Withdrawal left pending requests');
 saved.callbacks.INP(unreadable);saved.emit('focus');saved.tick();await drain();assert.equal(saved.sent.length,3);assert.equal(saved.imports,2);saved.close();

 const blocked=await scenario({provider:true});report(blocked,'LCP',2000);const blockedGeneration=blocked.callbacks;
 blocked.writeGuard(()=>assert.equal(blocked.sent[0].options.signal.aborted,true,'Blocked withdrawal invalidated too late'));
 blocked.blockWrites();blocked.button('Preferencias de cookies');blocked.button('Rechazar opcionales');await drain();
 assert.equal(blocked.cookie.analytics,true,'Simulation must retain old accepted cookie');assert.equal(blocked.props.enabled,false);assert.equal(blocked.props.revision,0);
 blocked.emit('focus');blocked.tick();await drain();assert.equal(blocked.props.enabled,false,'Old accepted cookie reactivated after failed save');
 blockedGeneration.CLS(unreadable);assert.equal(blocked.sent.length,1);assert.equal(blocked.imports,1);blocked.close();

 const unmounted=await scenario();report(unmounted,'LCP',1);const callbacks=unmounted.callbacks;unmounted.close();assert.equal(unmounted.sent[0].options.signal.aborted,true);callbacks.INP(unreadable);assert.equal(unmounted.sent.length,1);
 const late=await scenario({autoDrain:false});late.close();await drain();assert.equal(late.generations.at(-1).LCP,undefined,'Late import registered callbacks after unmount');
 const replaced=await scenario({autoDrain:false});replaced.emit('epo:consent-changed');replaced.render(true,1);await drain();assert.equal(replaced.imports,2);assert.equal(replaced.generations[0].LCP,undefined,'Late retired import registered observers');assert.equal(replaced.sent.length,0);report(replaced,'INP',50);assert.equal(replaced.sent.length,1,'Current replacement generation could not send');replaced.close();
 const moved=await scenario();moved.location.pathname='/alumno';moved.callbacks.LCP(unreadable);assert.equal(moved.sent.length,0);moved.navigate('/alumno');moved.navigate('/publico');await drain();assert.equal(moved.imports,1);moved.close();
 const parameters=await scenario();parameters.location.search='?record=synthetic';parameters.callbacks.LCP(unreadable);assert.equal(parameters.sent.length,0);parameters.close();
 console.log('PASS simulated metrics units: verified true->true save rearms pending INP/CLS without duplicate LCP; unchanged focus/timer do not restart; synchronous invalidation before writes; withdrawal/blocked storage abort and remain blocked; retired/unmounted/late generations cannot inspect or send; public-only scalar payload/document dedup. No browser metrics, DOM, network or DB.');
})().catch(error=>{console.error(error);process.exitCode=1;});
