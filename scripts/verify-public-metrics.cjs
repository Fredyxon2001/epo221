// Synthetic units only. No real network, cookies, users or database writes.
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { load } = require('./security-loader.cjs');
const metrics = load('src/lib/performance/public-metrics.ts');
const consent = load('src/lib/cookie-consent.ts');
const stamp = Date.now() - 1000;
const encode = v => encodeURIComponent(JSON.stringify(v));
assert.equal(consent.parseConsent(encode({ version:1, external:true, savedAt:stamp })).analytics, false);
assert.equal(consent.parseConsent(encode({ version:2, external:false, analytics:true, savedAt:stamp })).analytics, true);
assert.equal(consent.parseConsent(encode({ version:2, external:true, savedAt:stamp })), null);
assert.equal(consent.parseConsent(encode({ version:2, external:true, analytics:'true', savedAt:stamp })), null);
const valid = {route:'/publico',device:'mobile',samples:[{name:'LCP',value:2800},{name:'INP',value:200},{name:'CLS',value:.1}]};
assert.ok(metrics.parsePublicMetricPayload(valid));
for (const route of ['/login','/alumno','/publico?account=private','/publico/noticias/own-record','https://evil.invalid/publico','/publico/contacto#name']) assert.equal(metrics.parsePublicMetricPayload({...valid,route}),null);
for (const extra of [{...valid,device:['mobile']},{...valid,userId:'synthetic'},{...valid,url:'/publico'},{...valid,samples:[{name:'LCP',value:NaN}]},{...valid,samples:[{name:'CLS',value:6}]},{...valid,samples:[{name:'INP',value:-1}]},{...valid,samples:[{name:'LCP',value:20,id:'synthetic'}]},{...valid,samples:[{name:'LCP',value:20},{name:'LCP',value:30}]}]) assert.equal(metrics.parsePublicMetricPayload(extra),null);
const group = samples => metrics.summarizeMetrics([{route:'/publico',device:'mobile',metric:'LCP',bucket:4,samples}])[0];
assert.equal(group(19).samples,null);assert.equal(group(19).p75UpperBound,null);assert.equal(group(20).p75UpperBound,2000);
assert.equal(metrics.summarizeMetrics([{route:'/publico',device:'mobile',metric:'INP',bucket:3,samples:15},{route:'/publico',device:'mobile',metric:'INP',bucket:7,samples:5}])[0].p75UpperBound,150);
const overflow=metrics.summarizeMetrics([{route:'/publico',device:'mobile',metric:'LCP',bucket:13,samples:20}])[0];assert.equal(overflow.p75UpperBound,null);assert.equal(overflow.p75Above,30000);

(async()=>{
 let allowed=true, dbError=null, calls=[], limits=[];
 const handler=load('src/app/api/public/metricas/route.ts',{
  '@/lib/security/rate-limit':{rateLimit:async(...args)=>{limits.push(args);return allowed;}},
  '@/lib/supabase/admin':{adminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:dbError};}})},
 }).POST;
 const cookie=encode({version:2,external:false,analytics:true,savedAt:stamp});
 async function send(body=valid,headers={},raw){
  return handler(new NextRequest('https://school.invalid/api/public/metricas',{method:'POST',headers:{origin:'https://school.invalid','content-type':'application/json',cookie:`${consent.CONSENT_COOKIE}=${cookie}`,...headers},body:raw??JSON.stringify(body)}));
 }
 assert.equal((await send()).status,204);assert.equal(calls.length,1);
 assert.equal(calls[0].name,'record_public_metrics');
 assert.equal(JSON.stringify(calls[0].args),JSON.stringify({p_route:'/publico',p_device:'mobile',p_samples:[{name:'LCP',bucket:6},{name:'INP',bucket:4},{name:'CLS',bucket:4}]}));
 assert.equal(limits[0][3],'all-visitors');
 calls=[];
 assert.equal((await send(valid,{origin:'https://evil.invalid'})).status,403);
 assert.equal((await send(valid,{'sec-fetch-site':'cross-site'})).status,403);
 assert.equal((await send(valid,{cookie:''})).status,403);
 assert.equal((await send(valid,{cookie:`${consent.CONSENT_COOKIE}=${encode({version:1,external:true,savedAt:stamp})}`})).status,403);
 assert.equal((await send(valid,{cookie:`${consent.CONSENT_COOKIE}=${encode({version:2,external:true,analytics:false,savedAt:stamp})}`})).status,403);
 assert.equal((await send(valid,{'content-type':'text/plain'})).status,415);
 assert.equal((await send(valid,{'content-length':'1025'})).status,413);
 assert.equal((await send(valid,{},'x'.repeat(1025))).status,413);
 assert.equal((await send(valid,{},'{broken')).status,400);
 assert.equal((await send({...valid,route:'/alumno'})).status,400);
 assert.equal(calls.length,0,'Rejected request reached aggregate DB');
 allowed=false;assert.equal((await send()).status,429);assert.equal(calls.length,0);
 allowed=true;dbError={message:'synthetic'};assert.equal((await send()).status,503);
 const cronCalls=[];
 const cron=load('src/app/api/cron/seguridad/route.ts',{
  '@/lib/security/secrets':{cronAuthorized:()=>true},
  '@/lib/supabase/admin':{adminClient:()=>({rpc:async name=>{cronCalls.push(name);return {error:{message:'synthetic'}};}})},
  '@/lib/security/backup':{createSecurityBackup:async()=>{throw Error('Backup must not run after failed purge');}},
  '@/lib/security/upload-tickets':{cleanupStagedUploads:async()=>{throw Error('Cleanup must not run after failed purge');}},
 }).GET;
 const failed=await cron(new Request('https://school.invalid/api/cron/seguridad'));
 assert.equal(failed.status,500);assert.equal(cronCalls.join(','),'purge_public_metrics');assert.ok(!(await failed.json()).ok);
 console.log('PASS public metrics: v1 never opts in, strict public categories/bounds, no identifiers, cohort20/p75 buckets, same-origin/consent/body/rate fail-closed, aggregate-only RPC, purge failure prevents success. No DB writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
