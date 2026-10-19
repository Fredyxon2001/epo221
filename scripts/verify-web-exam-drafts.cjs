// Synthetic actual-source tests. No DB, accounts, browser, fixtures, env files or secrets.
'use strict';
const assert=require('node:assert/strict'),{load}=require('./security-loader.cjs');
const helper=load('src/lib/exam-drafts.ts');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function hookHarness(){
  const slots=[];let cursor=0,jobs=[],component,output,mounted=true;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
  function render(){if(!mounted||!component)return;cursor=0;jobs=[];output=component();for(const job of jobs)job();}
  const schedule=()=>queueMicrotask(render);
  const react={
    useRef:value=>{const n=cursor++;return slots[n]??(slots[n]={current:value});},
    useState:value=>{const n=cursor++;if(!(n in slots))slots[n]=typeof value==='function'?value():value;return[slots[n],next=>{const value=typeof next==='function'?next(slots[n]):next;if(!Object.is(value,slots[n])){slots[n]=value;schedule();}}];},
    useEffect:(fn,deps)=>{const n=cursor++;if(!slots[n]||!same(slots[n].deps,deps)){const old=slots[n];slots[n]={deps};jobs.push(()=>{old?.cleanup?.();slots[n].cleanup=fn();});}},
    useEffectEvent:fn=>fn,
    useTransition:()=>{const [pending,setPending]=react.useState(false);return[pending,fn=>{setPending(true);Promise.resolve(fn()).finally(()=>setPending(false));}];},
  };
  return {react,start:fn=>{component=fn;render();},output:()=>output,unmount:()=>{mounted=false;for(const slot of slots)slot?.cleanup?.();}};
}
function treeNodes(tree,type){
  if(!tree||typeof tree!=='object')return[];
  if(Array.isArray(tree))return tree.flatMap(node=>treeNodes(node,type));
  return [...(tree.type===type?[tree]:[]),...treeNodes(tree.props?.children,type)];
}
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setTimeout(resolve,0));};
function screenLab(initial={},gate=null){
  const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
  const hooks=hookHarness(),submissions=[],saved=[],routes=[];
  const jsx=(type,props)=>({type,props}),exports={};
  const modules={react:hooks.react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({replace:route=>routes.push(route),refresh(){}})},
    '../actions':{guardarRespuesta:async fd=>{saved.push(Object.fromEntries(fd));if(gate)await gate.promise;return{ok:true};},entregarIntento:async(attempt,answers)=>{submissions.push({attempt,answers:{...answers}});return{ok:true};}},
    '@/lib/exam-drafts':helper};
  const source=fs.readFileSync(path.join(__dirname,'../src/app/alumno/examenes/[id]/PresentarExamen.tsx'),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports,require:name=>modules[name],FormData,Map,Promise,confirm:()=>true,performance:{now:()=>1000},setInterval:()=>1,clearInterval(){},console});
  hooks.start(()=>exports.PresentarExamen({intentoId:id(999),preguntas:[{id:id(11),tipo:'abierta',enunciado:'Synthetic',puntos:1}],respuestasIniciales:initial,remainingSeconds:600}));
  const input=()=>treeNodes(hooks.output(),'textarea')[0];
  const button=()=>treeNodes(hooks.output(),'button').find(n=>typeof n.props.onClick==='function');
  return{hooks,input,button,submissions,saved,routes};
}
async function verifyScreen(){
  const large=Object.fromEntries(Array.from({length:10},(_,i)=>[id(i),'x'.repeat(10000)]));
  const fast=screenLab(large);await settle();
  const input=fast.input();assert.equal(input.props.maxLength,10000);assert.ok(input.props['aria-label']);
  input.props.onChange({target:{value:'Latest text without blur'}});
  const click=fast.button().props.onClick;click();click();await settle();
  assert.equal(fast.submissions.length,1,'Immediate double submit must freeze only once');
  assert.equal(fast.saved.length,0);assert.deepEqual(Object.keys(fast.submissions[0].answers),[id(11)]);
  assert.equal(fast.submissions[0].answers[id(11)],'Latest text without blur');fast.hooks.unmount();
  const gate=deferred(),race=screenLab({},gate);await settle();
  race.input().props.onChange({target:{value:'First saved value'}});
  void race.input().props.onBlur({target:{value:'First saved value'}});await settle();
  race.input().props.onChange({target:{value:'New value while prior save waits'}});
  race.button().props.onClick();await settle();assert.equal(race.submissions.length,0);
  gate.resolve();await settle();assert.equal(race.submissions[0].answers[id(11)],'New value while prior save waits','An old save acknowledgement must not erase the newer answer');race.hooks.unmount();
  const lateGate=deferred(),late=screenLab({},lateGate);await settle();
  late.input().props.onChange({target:{value:'Pending before unmount'}});void late.input().props.onBlur({target:{value:'Pending before unmount'}});await settle();
  late.button().props.onClick();late.hooks.unmount();lateGate.resolve();await settle();assert.equal(late.submissions.length,0);assert.equal(late.routes.length,0);
  console.log('PASS actual web exam JSX/hooks: latest text submits without blur, synchronous double-click latch, earlier save cannot replace newer draft, queued submit after unmount neither freezes nor navigates; open-answer accessible label/max length.');
}

async function main(){
  await verifyScreen();
  for(const value of ['ASCII','ñ中😀','quote"slash\\\n',String.fromCharCode(0xd800)])assert.equal(helper.examDraftBytes({[id(1)]:value}),Buffer.byteLength(JSON.stringify({[id(1)]:value})));
  const accepted=Object.fromEntries(Array.from({length:10},(_,i)=>[id(i),'x'.repeat(10000)]));
  assert.ok(Buffer.byteLength(JSON.stringify(accepted))>100000,'Reproduction must exceed existing SQL budget');
  let current={...accepted},confirmed={...accepted},saves=[],submits=[],active=true,expired=false,concurrent=0,maxConcurrent=0;
  const options={current:()=>current,confirmed:()=>confirmed,active:()=>active,expired:()=>expired,
    save:async(question,answer)=>{maxConcurrent=Math.max(maxConcurrent,++concurrent);await Promise.resolve();saves.push(question);confirmed={...confirmed,[question]:answer};--concurrent;},
    finish:async answers=>{assert.ok(helper.examDraftBytes(answers)<=90000);submits.push({...answers});return {ok:true};}};
  await helper.submitExamDraft(options);assert.equal(saves.length,0);assert.deepEqual(Object.keys(submits[0]),[],'Already-confirmed large exam must freeze without retransmitting answers');
  current={...accepted,[id(11)]:'Final text without blur'};submits=[];
  await helper.submitExamDraft(options);assert.equal(submits[0][id(11)],'Final text without blur');assert.equal(Object.keys(submits[0]).length,1);
  current=Object.fromEntries(Array.from({length:11},(_,i)=>[id(i),'ñ'.repeat(7000)]));confirmed={};saves=[];submits=[];
  await helper.submitExamDraft(options);assert.equal(saves.length,11);assert.equal(maxConcurrent,1);assert.deepEqual(Object.keys(submits[0]),[]);
  confirmed={};saves=[];submits=[];let fail=true;
  const failing={...options,save:async(question,answer)=>{if(question===id(2)&&fail)throw Error('Synthetic save failed');return options.save(question,answer);}};
  await assert.rejects(helper.submitExamDraft(failing));assert.equal(submits.length,0);assert.deepEqual(saves,[id(0),id(1)]);
  fail=false;await helper.submitExamDraft(failing);assert.equal(saves.length,11,'Retry must not resend previously confirmed first answers');assert.equal(new Set(saves).size,11);
  confirmed={};saves=[];submits=[];expired=true;
  await helper.submitExamDraft(options);assert.equal(saves.length,0);assert.deepEqual(Object.keys(submits[0]),[]);
  expired=false;submits=[];await helper.submitExamDraft({...options,save:async(q,a)=>{await options.save(q,a);if(saves.length===2)expired=true;}});assert.equal(saves.length,2);assert.deepEqual(Object.keys(submits[0]),[]);
  expired=false;confirmed={};saves=[];submits=[];const gate=deferred();
  const late=helper.submitExamDraft({...options,save:async(q,a)=>{await gate.promise;return options.save(q,a);}});active=false;gate.resolve();await assert.rejects(late);assert.equal(submits.length,0,'Unmounted generation must not freeze an attempt');
  let rpc=0,authorized=0,scoped=0;
  const actions=load('src/app/alumno/examenes/actions.ts',{
    '@/lib/security/access':{requireAccess:async()=>{authorized++;return{user:{id:id(999)}};}},
    '@/lib/security/resources':{requireResource:async()=>{scoped++;},requireAttempt:async()=>{},requireUuid:value=>assert.match(value,/^[0-9a-f-]{36}$/)},
    '@/lib/security/form-data':{validateFormData:async()=>{}},
    '@/lib/supabase/admin':{adminClient:()=>({rpc:async()=>{rpc++;return {error:null};}})},
    'next/cache':{revalidatePath(){}}
  });
  const blocked=await actions.entregarIntento(id(100),accepted);assert.ok(blocked.error);assert.equal(rpc,0);
  const done=await actions.entregarIntento(id(100),{});assert.equal(done.ok,true);assert.equal(rpc,1);assert.equal(authorized,2);assert.equal(scoped,2,'Empty/large submissions retain authorization');
  console.log('PASS web exam drafts: 100421-byte confirmed exam submits {}, current draft without blur kept, Unicode budget exact, large dirty answers serially confirmed, failed save/retry/expiry/unmount safe, action RPC byte budget and authorization preserved.');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
