// Create only an empty isolated singleton fixture. Never overwrite configuration.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{spawn}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const {assertIsolatedEnvironment}=require('./assert-isolated.cjs');
assertIsolatedEnvironment();
assert.ok(['http://localhost:3004','http://127.0.0.1:3004'].includes(process.env.FLOW_BASE_URL),'Own isolated web3004 required');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const marker='QA_cookie_map_'+randomUUID(),embed='https://www.google.com/maps/embed?q='+marker+'&output=embed';
async function checked(query,label){const result=await query;if(result.error)throw Error(label+' failed');return result.data;}
(async()=>{
 let inserted=false;
 try{
  assert.equal((await checked(db.from('sitio_config').select('id').limit(1),'Configuration precheck')).length,0,'Refuse to modify existing isolated configuration');
  await checked(db.from('sitio_config').insert({id:1,nombre_escuela:marker,cct:'QA-COOKIE',mapa_embed_url:embed}),'Fixture insert');inserted=true;
  const exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/verify-cookie-consent-browser.cjs'],{cwd:process.cwd(),env:process.env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>resolve(code));});
  assert.equal(exitCode,0,'Cookie/map browser regression failed');
 }finally{
  if(inserted){
   await checked(db.from('sitio_config').delete().eq('id',1).eq('nombre_escuela',marker),'Own fixture cleanup');
   const logs=await checked(db.from('auditoria').select('id,cambios').eq('tabla','sitio_config').eq('registro_id','1'),'Own fixture audit check');
   const owned=logs.filter(log=>JSON.stringify(log.cambios).includes(marker)).map(log=>log.id);
   assert.equal(owned.length,2,'Synthetic insert/delete audit entries could not be identified');
   if(owned.length)await checked(db.from('auditoria').delete().in('id',owned),'Own fixture audit cleanup');
   assert.equal((await checked(db.from('auditoria').select('id').in('id',owned),'Audit cleanup verification')).length,0);
   assert.equal((await checked(db.from('sitio_config').select('id').eq('id',1),'Cleanup verification')).length,0);
   console.log('PASS isolated cookie/map fixture and matching synthetic audit entries removed; no existing rows modified, metrics intercepted, no accounts created.');
  }
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
