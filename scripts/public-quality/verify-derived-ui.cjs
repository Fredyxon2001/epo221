// Synthetic row fixtures, real server-component JSX and React SSR; no DB/network.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'../..'),variants=require('../../src/lib/public-derived-documents.json');
const proof=require('./derived-pdfs-proof.json'),crypto=require('node:crypto');
function compile(relative,overrides={}){
  const filename=path.join(root,relative),exports={};
  const {outputText}=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  new vm.Script(outputText,{filename}).runInNewContext({module:{exports},exports,require:id=>Object.hasOwn(overrides,id)?overrides[id]:require(id),Date,Map});
  return exports;
}
(async()=>{
  assert.equal(variants.length,4);assert.equal(proof.derived.length,4);
  for(let i=0;i<variants.length;i++){const v=variants[i],p=proof.derived[i];assert.equal(v.source,p.source);assert.equal(v.download,p.derived);for(const [file,hash] of [[v.source,p.sourceSha256],[v.download,p.derivedSha256]]){const bytes=fs.readFileSync(path.join(root,'public',file));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash,'Versioned public PDF bytes changed');}}
  const helper=compile('src/lib/public-derived-documents.ts',{'./public-derived-documents.json':variants});
  const guidance=compile('src/lib/public-guidance.ts');
  assert.equal(helper.historicalPdfWithTitle('/descargas/custom.pdf','Solicitud de inscripción'),null);
  assert.equal(helper.historicalPdfWithTitle(variants[0].source,'Wrong title'),null);
  assert.equal(helper.historicalPdfWithTitle('https://evil.example'+variants[0].source,variants[0].title),null);
  const docs=variants.map((v,i)=>({id:'synthetic-'+i,titulo:v.title,descripcion:'Historical synthetic row',version:'Historical fixture',vigente:false,ciclo_id:null,pdf_url:v.source,docx_url:v.source.replace('.pdf','.docx'),updated_at:'2026-01-01T00:00:00Z',ciclos_escolares:null}));
  docs.push({...docs[0],id:'other',titulo:'Other published version',pdf_url:'/api/public/documentos/7df361cb-80a6-435b-935c-42ee70f68d1a/pdf',docx_url:null});
  let selections=[];
  const client={from:table=>{assert.equal(table,'documentos_publicos');return{select:fields=>{selections.push(fields);return{eq:(column,value)=>{assert.equal(column,'publicada');assert.equal(value,true);return{order:()=>({order:async()=>({data:docs,error:null})})};}};}};}};
  const page=compile('src/app/publico/descargas/page.tsx',{
    'next/link':({href,children,...props})=>React.createElement('a',{href,...props},children),
    '@/lib/supabase/server':{createClient:async()=>client},
    '@/lib/public-guidance':guidance,
    '@/lib/public-derived-documents':helper,
    '@/lib/public-document-readings':compile('src/lib/public-document-readings.ts',{'./public-document-readings.json':require('../../src/lib/public-document-readings.json')})
  });
  const html=renderToStaticMarkup(await page.default({searchParams:Promise.resolve({})}));
  for(const variant of variants){
    assert.ok(html.includes('href="'+variant.source+'"'),'Original link replaced');
    assert.ok(html.includes('href="'+variant.download+'"'),'Supplement missing');
    assert.ok(fs.existsSync(path.join(root,'public',variant.download)),'Missing derivative asset');
  }
  assert.equal((html.match(/href="[^"]*-titulo-v2\.pdf"/g)||[]).length,4);
  assert.ok(html.includes('No es una certificación de accesibilidad.'));
  assert.ok(html.includes('Conserva el mismo contenido y vigencia'));
  assert.ok(html.includes('Histórico · confirmar su uso'));
  assert.equal(selections.length,1,'Extra data query introduced');
  assert.ok(!html.includes('https://evil.example'));
  console.log('PASS public document SSR: four exact historical source/title pairs receive separate title-only variants; original links/version/warnings kept, unrelated published/uploaded files unchanged, no additional query or network.');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
