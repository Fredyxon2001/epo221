// Opt-in production smoke checks with disposable synthetic accounts. No real records or emails.
if(!process.argv.includes('--live'))throw Error('Requiere --live para crear fixtures temporales.');
require('@next/env').loadEnvConfig(process.cwd());
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const fixtures=[];
function otp(secret){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0,bytes=[];
  for(const char of secret.toUpperCase().replace(/=+$/,'')){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bits-=8;bytes.push((value>>bits)&255);}}
  const time=Buffer.alloc(8);time.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=crypto.createHmac('sha1',Buffer.from(bytes)).update(time).digest();const at=digest[19]&15;
  return String((digest.readUInt32BE(at)&0x7fffffff)%1000000).padStart(6,'0');
}
async function rpc(client,name,args){const result=await client.rpc(name,args);if(result.error)throw Error(`RPC ${name}: ${result.error.code ?? 'failed'}`);return result.data;}
async function createFixture(role,index){
  const email=`security-fixture-${crypto.randomUUID()}@example.invalid`,password=crypto.randomBytes(24).toString('base64url');
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:'Security Fixture'}});
  if(error||!data.user)throw Error('No se pudo crear el fixture Auth.');
  const fixture={id:data.user.id,role};fixtures.push(fixture);
  const {error:profileError}=await admin.from('perfiles').upsert({id:fixture.id,rol:role,nombre:'Security Fixture',email,activo:true,debe_cambiar_password:false});
  if(profileError)throw Error('No se pudo configurar el perfil sintético.');
  if(role==='alumno'){
    const {data:student,error}=await admin.from('alumnos').insert({perfil_id:fixture.id,curp:`ZZZZ010101HMCXXX${String(index).padStart(2,'0')}`,nombre:'Security',apellido_paterno:'Fixture',matricula:`FIX${crypto.randomBytes(4).toString('hex')}`}).select('id').single();
    if(error)throw Error(`No se pudo crear el alumno sintético: ${error.code}`);fixture.studentId=student.id;
  }
  const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const login=await client.auth.signInWithPassword({email,password});if(login.error)throw Error('No se pudo iniciar la sesión sintética.');
  fixture.client=client;return fixture;
}
async function enroll(fixture){
  const {data,error}=await fixture.client.auth.mfa.enroll({factorType:'totp',issuer:'EPO221 Synthetic Test'});
  if(error)throw Error('No se pudo registrar MFA sintético.');
  const verified=await fixture.client.auth.mfa.challengeAndVerify({factorId:data.id,code:otp(data.totp.secret)});
  if(verified.error)throw Error('No se pudo verificar MFA sintético.');
}
async function main(){try{
  const student=await createFixture('alumno',91),other=await createFixture('alumno',92),professor=await createFixture('profesor',0),finance=await createFixture('finanzas',0),administrator=await createFixture('admin',0);
  assert.equal(await rpc(student.client,'security_session_alive'),true);
  assert.equal(await rpc(student.client,'security_session_valid'),true);
  const own=await student.client.from('alumnos').select('id').eq('id',student.studentId);assert.equal(own.error,null);assert.equal(own.data.length,1);
  const foreign=await student.client.from('alumnos').select('id').eq('id',other.studentId);assert.equal(foreign.error,null);assert.equal(foreign.data.length,0);
  const unrelated=await professor.client.from('alumnos').select('id').eq('id',student.studentId);assert.equal(unrelated.error,null);assert.equal(unrelated.data.length,0);
  const escalation=await student.client.from('perfiles').update({rol:'admin'}).eq('id',student.id).select('id');assert.ok(escalation.error||escalation.data?.length===0);
  const answerKey=await student.client.from('examen_preguntas').select('respuesta_correcta').limit(1);assert.ok(answerKey.error);
  assert.equal(await rpc(administrator.client,'security_session_valid'),false);assert.equal(await rpc(finance.client,'security_session_valid'),false);
  await enroll(administrator);await enroll(finance);
  assert.equal(await rpc(administrator.client,'security_session_valid'),true);assert.equal(await rpc(finance.client,'security_session_valid'),true);
  const financeStudent=await finance.client.from('alumnos').select('id').eq('id',student.studentId);assert.equal(financeStudent.error,null);assert.equal(financeStudent.data.length,0);
  const adminStudent=await administrator.client.from('alumnos').select('id').eq('id',student.studentId);assert.equal(adminStudent.error,null);assert.equal(adminStudent.data.length,1);
  await admin.from('perfiles').update({debe_cambiar_password:true}).eq('id',student.id);assert.equal(await rpc(student.client,'security_session_valid'),false);
  await rpc(admin,'security_revoke_user_sessions',{p_user_id:professor.id});assert.equal(await rpc(professor.client,'security_session_alive'),false);
  const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const anonymous=await anon.from('alumnos').select('id').eq('id',student.studentId);assert.ok(anonymous.error||anonymous.data.length===0);
  const dangerous=await anon.rpc('crear_usuario_test',{});assert.ok(dangerous.error);
  console.log('PASS live: own student/foreign denial, unrelated teacher, role escalation denied, answer-key denial, admin/finance AAL1 denied and TOTP AAL2 accepted, password gate and immediate session revocation.');
}finally{
  let failed=0;
  for(const fixture of fixtures.reverse()){
    if(fixture.studentId){const {error}=await admin.from('alumnos').delete().eq('id',fixture.studentId);if(error)failed++;}
    const {error}=await admin.auth.admin.deleteUser(fixture.id);if(error)failed++;
  }
  if(failed)throw Error('La limpieza de fixtures requiere revisión administrativa.');
  console.log('Temporary synthetic accounts cleaned.');
}}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
