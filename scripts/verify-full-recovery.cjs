// Destructive rehearsal ONLY in the own loopback Supabase, with synthetic accounts.
// Database dump, Auth hashes/MFA and file bytes stay in memory or AES-GCM ciphertext.
if(!process.argv.includes('--isolated'))throw Error('Requires --isolated; never restore production');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {root,project,environment,sql}=require('./isolated-stack.cjs');
const {assertIsolatedEnvironment}=require('./assert-isolated.cjs');
assertIsolatedEnvironment();const expected=environment();assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,expected.NEXT_PUBLIC_SUPABASE_URL);assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY,expected.SUPABASE_SERVICE_ROLE_KEY);
const {createFixtures,otp}=require('./flow-fixtures.cjs'),{load}=require('./security-loader.cjs');
const {encryptBackup,decryptBackup}=load('src/lib/security/backup.ts',{},process.env);
const f=createFixtures(),pause=ms=>new Promise(r=>setTimeout(r,ms));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function binary(args,input){try{return execFileSync('docker',args,{input,timeout:180000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});}catch(e){const safe=String(e.stderr??'').split(/\r?\n/).filter(l=>/ERROR:/.test(l)&&!/(key|token|password|secret|eyJ|cookie)/i.test(l)).slice(0,2).join(' ');throw Error('Native local database rehearsal failed: '+safe);}}
const services=['supabase_auth_'+project,'supabase_storage_'+project];let halted=false,stage='fixtures',failed=false;
async function ready(){for(let i=0;i<60;i++){try{const r=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/health',{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(3000)});const buckets=await f.admin.storage.listBuckets();if(r.ok&&!buckets.error)return;}catch{}await pause(1000);}throw Error('Restored local Auth/Storage did not become healthy');}
async function main(){try{
 const own=await f.account('alumno',87),foreign=await f.account('alumno',88),privileged=await f.account('admin');await f.enroll(privileged);
 const cycle=await f.row('ciclos_escolares',{codigo:'FLOW-RECOVERY-'+crypto.randomUUID(),periodo:'Verification',activo:false});
 const group=await f.row('grupos',{ciclo_id:cycle,grado:1,semestre:1,grupo:1,turno:'matutino'});
 await f.row('inscripciones',{alumno_id:own.studentId,grupo_id:group,ciclo_id:cycle,estatus:'activa'});
 const file=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAXkAAAAASUVORK5CYII=','base64'),name=own.id+'/recovery.png';
 const upload=await f.admin.storage.from('avatares').upload(name,file,{contentType:'image/png'});assert.equal(upload.error,null,'Synthetic file upload');
 const privateName=own.studentId+'/recovery.png';
 assert.equal((await own.client.storage.from('portafolio').upload(privateName,file,{contentType:'image/png'})).error,null,'Private synthetic upload');
 f.cleanups.push(async()=>{assert.equal((await f.admin.storage.from('portafolio').remove([privateName])).error,null,'Private restored fixture cleanup');});
 const token=(await own.client.auth.getSession()).data.session.access_token;
 stage='encrypted native backup';
 // Supabase-managed extension infrastructure must already exist in the target
 // matching stack; dropping its GraphQL hooks would affect schemas outside this
 // application archive. Preserve extension inventory separately in the manifest.
 const extensions=JSON.parse(sql("SELECT coalesce(json_agg(json_build_object('name',extname,'version',extversion,'schema',n.nspname)),'[]') FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace;").trim());
 const dump=binary(['exec','supabase_db_'+project,'pg_dump','-U','postgres','-Fc','-n','public','-n','auth','-n','storage','postgres']);
 const manifest={version:1,scope:'synthetic-own-local-stack',postgres:sql('show server_version;').trim(),extensions,dump:dump.toString('base64'),dumpHash:hash(dump),files:[{bucket:'avatares',name},{bucket:'portafolio',name:privateName}].map(object=>({...object,bytes:file.toString('base64'),sha256:hash(file)}))};
 const encrypted=encryptBackup(require('node:zlib').gzipSync(Buffer.from(JSON.stringify(manifest))));
 const archive=path.join(root,'.qa','recovery','synthetic-full.enc');fs.mkdirSync(path.dirname(archive),{recursive:true});fs.writeFileSync(archive,encrypted);
 const restored=JSON.parse(require('node:zlib').gunzipSync(decryptBackup(fs.readFileSync(archive))).toString());
 assert.equal(restored.scope,'synthetic-own-local-stack');assert.equal(hash(Buffer.from(restored.dump,'base64')),manifest.dumpHash);
 console.log('PASS full native database/Auth/MFA schema and synthetic Storage bytes encrypted and validated; no plaintext artifact.');
 stage='simulated loss';
 for(const object of restored.files)assert.equal((await f.admin.storage.from(object.bucket).remove([object.name])).error,null);
 assert.equal((await f.admin.auth.admin.deleteUser(own.id)).error,null);
 assert.ok((await own.client.auth.signInWithPassword({email:own.email,password:own.password})).error,'Synthetic deleted account must fail login');
 console.log('PASS simulated account/file loss reproduced only in own disposable stack.');
 stage='native restore';assertIsolatedEnvironment();
 for(const service of services)binary(['stop',service]);halted=true;
 // Provider-owned Auth/Storage tables require the administrator of this disposable
 // container. This role is never available through a hosted-project client.
 binary(['exec','-i','supabase_db_'+project,'pg_restore','-U','supabase_admin','--clean','--if-exists','--exit-on-error','-d','postgres'],Buffer.from(restored.dump,'base64'));
 // Never revive sessions captured before the incident.
 sql("DELETE FROM auth.sessions; NOTIFY pgrst,'reload schema';");
 for(const service of services)binary(['start',service]);halted=false;await ready();
 stage='file recovery';
 for(const object of restored.files){const bytes=Buffer.from(object.bytes,'base64');assert.equal(hash(bytes),object.sha256);const uploaded=await f.admin.storage.from(object.bucket).upload(object.name,bytes,{contentType:'image/png',upsert:true});if(uploaded.error){console.error('Local restored Storage upload status '+String(uploaded.error.statusCode??uploaded.error.status??'unknown'));throw Error('Recovered upload failed');}const downloaded=await f.admin.storage.from(object.bucket).download(object.name);if(downloaded.error){console.error('Local restored Storage download status '+String(downloaded.error.statusCode??downloaded.error.status??'unknown'));throw Error('Recovered download failed');}assert.equal(hash(Buffer.from(await downloaded.data.arrayBuffer())),object.sha256);}
 stage='recovered access and RLS';
 const {createClient}=require('@supabase/supabase-js');
 const stale=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 assert.equal((await stale.rpc('security_session_alive')).data,false,'Pre-incident JWT session must stay revoked');
 assert.equal((await own.client.auth.signInWithPassword({email:own.email,password:own.password})).error,null,'Restored password login');
 assert.equal((await own.client.storage.from('portafolio').download(privateName)).error,null,'Restored owner can read private bytes');
 assert.equal((await foreign.client.auth.signInWithPassword({email:foreign.email,password:foreign.password})).error,null,'Foreign recovered account signs in before permission check');
 assert.ok((await foreign.client.storage.from('portafolio').download(privateName)).error,'Foreign user cannot read restored private bytes');
 const self=await own.client.from('alumnos').select('id').eq('id',own.studentId);assert.equal(self.error,null);assert.equal(self.data.length,1);
 const outside=await own.client.from('alumnos').select('id').eq('id',foreign.studentId);assert.equal(outside.error,null);assert.equal(outside.data.length,0);
 const enrollment=await own.client.from('inscripciones').select('grupo_id').eq('alumno_id',own.studentId);assert.equal(enrollment.error,null);assert.equal(enrollment.data[0].grupo_id,group);
 assert.equal((await privileged.client.auth.signInWithPassword({email:privileged.email,password:privileged.password})).error,null);
 assert.equal((await privileged.client.rpc('security_session_valid')).data,false,'Privileged fresh AAL1 must be blocked');
 const factors=await privileged.client.auth.mfa.listFactors();assert.equal(factors.error,null);assert.ok(factors.data.totp.some(item=>item.id===privileged.factorId&&item.status==='verified'),'Original TOTP factor recovered');
 if(Date.now()%30000>22000)await pause(31000-Date.now()%30000);
 assert.equal((await privileged.client.auth.mfa.challengeAndVerify({factorId:privileged.factorId,code:otp(privileged.totp)})).error,null,'Recovered TOTP secret');
 assert.equal((await privileged.client.rpc('security_session_valid')).data,true,'Restored AAL2 access');
 console.log(JSON.stringify({ok:true,postgres:manifest.postgres,authPasswordRecovery:true,originalMfaFactorAndSecret:true,oldSessionsRevoked:true,foreignStudentDenied:true,enrollmentRelations:true,storageBytesHash:true,rlsFunctionsTriggersAndGrants:true,scope:'own synthetic local Supabase',productionRestore:false}));
}catch(e){failed=true;console.error('Full isolated recovery failed at '+stage+'; '+(e.message.startsWith('Native local')?e.message:'sensitive details suppressed.'));throw Error('Full isolated recovery failed at '+stage);}finally{
 if(halted){for(const service of services)try{binary(['start',service]);}catch{}await ready();}
 try{await f.cleanup();}catch{console.error('Isolated recovery fixture cleanup failed; reset only the disposable stack before further tests.');if(!failed)throw Error('Isolated recovery cleanup failed');}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
