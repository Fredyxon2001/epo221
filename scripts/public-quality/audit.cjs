// Anonymous, bounded public HTTP audit. No environment files, browser, cookies or credentials.
'use strict';
const PAGE_SEEDS = ['/publico','/publico/oferta','/publico/guia','/publico/convocatorias','/publico/descargas','/publico/noticias','/publico/albumes','/publico/conoce','/publico/contacto','/app-movil','/cookies','/privacidad','/login'];
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DOCUMENT=new RegExp('^/api/public/documentos/('+UUID+')/(pdf|docx)$','i');
const FILE=/^\/descargas\/[a-zA-Z0-9_-]+\.(pdf|docx)$/;
function targetOrigin(value='https://epo221.edu.mx') {
  if(typeof value!=='string'||! /^(?:https:\/\/(?:www\.)?epo221\.edu\.mx|http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4})\/?$/.test(value))throw Error('Invalid audit origin');
  const u=new URL(value);
  if(u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw Error('Invalid audit origin');
  const production=u.protocol==='https:'&&['epo221.edu.mx','www.epo221.edu.mx'].includes(u.hostname)&&!u.port;
  const local=u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port&&Number(u.port)>0;
  if(!production&&!local)throw Error('Audit origin must be institutional HTTPS or explicit IPv4 loopback');
  return u.origin;
}
function routeKind(pathname) {
  if(PAGE_SEEDS.includes(pathname))return 'page';
  if(/^\/publico\/(?:noticias|albumes|paginas)\/[a-zA-Z0-9_-]{1,180}$/.test(pathname))return 'page';
  if(FILE.test(pathname)||DOCUMENT.test(pathname))return 'document';
  if(pathname==='/app-movil/descargar')return 'apk';
  return null;
}
function candidate(raw, origin, from='/publico') {
  if(typeof raw!=='string'||raw.length>2048||/[\\\u0000-\u0020\u007f]/.test(raw))return null;
  try{
    const u=new URL(raw,origin+from);
    if(u.origin!==origin||u.username||u.password||u.search||u.pathname.includes('%'))return null;
    const kind=routeKind(u.pathname);if(!kind)return null;
    return {route:u.pathname,kind,hash:u.hash};
  }catch{return null;}
}
function decodeAttribute(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[0-9a-f]+|\d+);/gi,part=>{
    const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
    if(named[part.toLowerCase()])return named[part.toLowerCase()];
    const hex=/^&#x/i.test(part), n=parseInt(part.slice(hex?3:2,-1),hex?16:10);
    return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
  });
}
function anchors(html) {
  // SSR anchor attributes only; this is deliberately not a JavaScript/DOM crawler.
  const clean=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  return [...clean.matchAll(/<a\b[^>]*\s+href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi)]
    .map(m=>decodeAttribute(m[1]??m[2]??m[3]));
}
async function limitedBody(response,maxBytes) {
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>maxBytes){await response.body?.cancel();throw Error('Body limit');}
  const chunks=[];let size=0;
  if(!response.body)return Buffer.alloc(0);
  const reader=response.body.getReader();
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maxBytes)throw Error('Body limit');chunks.push(Buffer.from(part.value));}}
  catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
  return Buffer.concat(chunks);
}
function delegatedDestination(route, location, origin) {
  try{
    const u=new URL(location,origin);
    if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hash)return false;
    const doc=route.match(DOCUMENT);
    if(doc){
      const expected=new RegExp('^/storage/v1/object/sign/documentos-escolares/'+doc[1]+'/'+UUID+'\\.'+doc[2]+'$','i');
      return /^[a-z0-9]{20}\.supabase\.co$/.test(u.hostname)&&expected.test(u.pathname)
        &&u.searchParams.has('token')&&[...u.searchParams.keys()].every(key=>['token','download'].includes(key));
    }
    return route==='/app-movil/descargar'&&u.hostname==='github.com'&&!u.search&&/^\/Fredyxon2001\/epo221\/releases\/download\/[a-zA-Z0-9._-]+\/epo221-[a-zA-Z0-9._-]+\.apk$/.test(u.pathname);
  }catch{return false;}
}
async function inspectResource(origin,route,kind,options) {
  const {fetchImpl=fetch,timeoutMs=12000,maxHtmlBytes=2*1024*1024,deadlineAt=Date.now()+120000}=options;
  let current=route;const seen=new Set();
  for(let hop=0;hop<4;hop++){
    if(seen.has(current))return {route,ok:false,reason:'redirect-loop'};seen.add(current);
    let response;
    if(Date.now()>=deadlineAt)return {route,ok:false,reason:'audit-deadline'};
    try{
      response=await fetchImpl(origin+current,{method:kind==='page'?'GET':'HEAD',redirect:'manual',credentials:'omit',
        headers:{Accept:kind==='page'?'text/html':'*/*','User-Agent':'EPO221-public-quality/1'},signal:AbortSignal.timeout(Math.max(1,Math.min(timeoutMs,deadlineAt-Date.now())))});
      if([301,302,303,307,308].includes(response.status)){
        const location=response.headers.get('location');
        await response.body?.cancel();
        const next=candidate(location,origin,current);
        if(next){if(next.kind!==kind)return {route,ok:false,reason:'redirect-kind'};current=next.route;continue;}
        if(delegatedDestination(route,location,origin))return {route,ok:true,status:response.status,delegated:true,bytesVerified:false};
        return {route,ok:false,reason:'redirect-outside-scope'};
      }
      if(response.status!==200){await response.body?.cancel();return {route,ok:false,status:response.status,reason:'http-status'};}
      const contentType=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();
      if(kind!=='page'){
        await response.body?.cancel();
        const wanted=route.endsWith('/pdf')||route.endsWith('.pdf')?'application/pdf':route.endsWith('/docx')||route.endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':null;
        return {route,ok:!wanted||contentType===wanted,status:200,...(wanted&&contentType!==wanted?{reason:'document-content-type'}:{}),bytesVerified:false};
      }
      if(contentType!=='text/html'){await response.body?.cancel();return {route,ok:false,reason:'html-content-type'};}
      const html=(await limitedBody(response,maxHtmlBytes)).toString('utf8');
      return {route,ok:true,status:200,html};
    }catch{return {route,ok:false,reason:'request-or-body-limit'};}
  }
  return {route,ok:false,reason:'redirect-limit'};
}
async function audit({base='https://epo221.edu.mx',seeds=PAGE_SEEDS,fetchImpl=fetch,maxPages=40,maxDocuments=16,maxLinks=180,timeoutMs=12000,maxHtmlBytes=2*1024*1024,deadlineMs=120000}={}) {
  const origin=targetOrigin(base), started=Date.now(), pages=new Set(), documents=new Set(), queue=[], queued=new Set(), results=[], stats={ignoredLinks:0,delegated:0};
  let truncated=false;
  for(const seed of seeds){const c=candidate(seed,origin);if(!c||c.kind!=='page')throw Error('Invalid public seed');if(!queued.has(c.route)){queue.push(c);queued.add(c.route);}}
  while(queue.length){
    if(Date.now()-started>deadlineMs){truncated=true;break;}
    const item=queue.shift(),set=item.kind==='page'?pages:documents,limit=item.kind==='page'?maxPages:maxDocuments;
    if(set.size>=limit){truncated=true;continue;}set.add(item.route);
    const result=await inspectResource(origin,item.route,item.kind,{fetchImpl,timeoutMs:Math.min(timeoutMs,Math.max(1,deadlineMs-(Date.now()-started))),maxHtmlBytes,deadlineAt:started+deadlineMs});
    if(result.delegated)stats.delegated++;
    if(result.html){
      const hrefs=anchors(result.html);
      for(const href of hrefs){
        const c=candidate(href,origin,item.route);
        if(!c){stats.ignoredLinks++;continue;}
        if(!queued.has(c.route)){
          if(queued.size>=maxLinks){truncated=true;continue;}
          queued.add(c.route);queue.push(c);
        }
      }
      delete result.html;
    }
    results.push(result);
  }
  const failures=results.filter(r=>!r.ok);
  return {schema:1,checkedAt:new Date().toISOString(),origin,pages:pages.size,documents:documents.size,
    failures,delegated:results.filter(r=>r.delegated).map(({route,status,bytesVerified})=>({route,status,bytesVerified})),
    ignoredLinks:stats.ignoredLinks,truncated,complete:!truncated,ok:!failures.length&&!truncated,
    scope:'Anonymous SSR anchors on allowed public routes. External/query/encoded/private links skipped; delegated assets not fetched. No PDF/UA, WCAG or field-performance certification.'};
}
module.exports={PAGE_SEEDS,targetOrigin,routeKind,candidate,anchors,limitedBody,delegatedDestination,inspectResource,audit};
if(require.main===module){
  const args=process.argv.slice(2);if(args.length>1)throw Error('Usage: node scripts/public-quality/audit.cjs [institutional-or-loopback-origin]');
  audit({base:args[0]}).then(report=>{console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;})
    .catch(()=>{console.error('Public audit failed before producing a complete report.');process.exitCode=1;});
}
