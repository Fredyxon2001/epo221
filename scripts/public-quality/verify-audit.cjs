// Real ephemeral loopback HTTP fixtures. No school backend or credentials.
'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {targetOrigin,candidate,anchors,audit,delegatedDestination}=require('./audit.cjs');
(async()=>{
  for(const origin of ['http://epo221.edu.mx','https://evil.example','https://epo221.edu.mx.evil.example','https://user:secret@epo221.edu.mx','https://epo221.edu.mx/?token=secret','http://localhost:3004','http://169.254.169.254','http://2130706433:3004','file:///etc/passwd','https://127.0.0.1:3004']){
    assert.throws(()=>targetOrigin(origin),'Unsafe origin accepted');
  }
  assert.equal(targetOrigin('https://www.epo221.edu.mx'),'https://www.epo221.edu.mx');
  const origin='http://127.0.0.1:3004';
  for(const href of ['//169.254.169.254/latest/meta-data','https://evil.example/publico','/admin','/api/mobile/tasks','/publico?token=secret','/publico/%2e%2e/admin','/publico/../admin','/publico\\@evil.example','javascript:alert(1)','/app-movil/descargar?next=https://evil.example']){
    assert.equal(candidate(href,origin),null,'Unsafe candidate accepted');
  }
  assert.equal(candidate('/publico/noticias/nota-1#contenido',origin).route,'/publico/noticias/nota-1');
  assert.deepEqual(anchors('<script>const x=\'<a href="/admin">\'</script><!--<a href="/bad">--><a href="/publico?x=1&amp;y=2">1</a><a href=&#47;cookies>2</a>'),['/publico?x=1&y=2','/cookies']);
  const id='7df361cb-80a6-435b-935c-42ee70f68d1a',file='779a214f-17b7-4383-a332-e942924df9c8';
  const doc='/api/public/documentos/'+id+'/pdf';
  const signed='https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/sign/documentos-escolares/'+id+'/'+file+'.pdf?token=not-a-real-secret&download=';
  assert.equal(delegatedDestination(doc,signed,origin),true);
  assert.equal(delegatedDestination(doc,signed.replace(id,file),origin),false);
  assert.equal(delegatedDestination(doc,signed.replace('documentos-escolares','school-private'),origin),false);
  assert.equal(delegatedDestination(doc,signed+'&redirect=evil',origin),false);
  let mode='good',hits=[],timer;
  const server=http.createServer((req,res)=>{
    hits.push({method:req.method,url:req.url,headers:req.headers});
    if(req.url==='/publico'){
      res.setHeader('content-type','text/html');
      res.end(mode!=='limit'?'<h1>Fixture</h1><a href="/cookies">Cookies</a><a href="/descargas/test.pdf">PDF</a><a href="'+doc+'">Delegated</a><a href="/admin">Private ignored</a><a href="//169.254.169.254/latest/meta-data">External ignored</a><a href="/publico?secret=value">Query ignored</a>':mode==='limit'?'<h1>'+ 'x'.repeat(2048)+'</h1>':'<a href="/cookies">Next</a>');
    }else if(req.url==='/cookies'){
      if(mode==='external'){res.writeHead(302,{location:'http://169.254.169.254/latest/meta-data'});res.end();}
      else if(mode==='loop'){res.writeHead(302,{location:'/cookies'});res.end();}
      else if(mode==='bad-status'){res.writeHead(503);res.end();}
      else if(mode==='timeout'){timer=setTimeout(()=>res.end('late'),500);}
      else{res.setHeader('content-type','text/html');res.end('<h1>Cookies fixture</h1>');}
    }else if(req.url==='/descargas/test.pdf'){res.setHeader('content-type',mode==='bad-mime'?'text/html':'application/pdf');res.end('%PDF-1.4');}
    else if(req.url===doc){res.writeHead(307,{location:signed});res.end();}
    else{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const report=await audit({base,seeds:['/publico']});
    assert.equal(report.ok,true);assert.equal(report.pages,2);assert.equal(report.documents,2);assert.equal(report.ignoredLinks,3);
    assert.equal(report.delegated.length,1);assert.equal(report.delegated[0].bytesVerified,false);
    assert.ok(!JSON.stringify(report).includes('not-a-real-secret'));
    assert.deepEqual(hits.map(h=>[h.method,h.url]),[['GET','/publico'],['GET','/cookies'],['HEAD','/descargas/test.pdf'],['HEAD',doc]]);
    assert.ok(hits.every(h=>!h.headers.authorization&&!h.headers.cookie),'Credentials transmitted');
    for(const [next,reason] of [['external','redirect-outside-scope'],['loop','redirect-loop'],['bad-status','http-status'],['bad-mime','document-content-type'],['timeout','request-or-body-limit'],['limit','request-or-body-limit']]){
      mode=next;hits=[];const result=await audit({base,seeds:['/publico'],timeoutMs:100,maxHtmlBytes:1024});
      assert.equal(result.ok,false,next+' falsely passed');assert.ok(result.failures.some(f=>f.reason===reason),next+' wrong failure');
      assert.ok(hits.every(h=>!h.url.startsWith('http')&&!h.url.startsWith('/admin')),'Escaped local scope');
    }
    mode='good';const limited=await audit({base,seeds:['/publico'],maxPages:1});assert.equal(limited.truncated,true);assert.equal(limited.ok,false);
    const capped=await audit({base,seeds:['/publico'],maxDocuments:1});assert.equal(capped.complete,false);
    const expired=await audit({base,seeds:['/publico'],deadlineMs:-1});assert.equal(expired.complete,false);assert.equal(expired.ok,false);
    let fetched=false;await assert.rejects(audit({base:'https://evil.example',fetchImpl:()=>{fetched=true;}}));assert.equal(fetched,false);
    console.log('PASS public quality: actual local GET/HEAD, no credentials/private/external requests, signed URL not followed or logged, wrong identity/bucket/query denied, redirects/loops/status/MIME/stream cap/timeout/completeness fail closed.');
  }finally{if(timer)clearTimeout(timer);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
