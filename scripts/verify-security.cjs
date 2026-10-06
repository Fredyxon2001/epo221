const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {load}=require('./security-loader.cjs');
const env={NODE_ENV:'production',CREDENTIALS_ENCRYPTION_KEY:'synthetic-credential-key',BACKUP_ENCRYPTION_KEY:'synthetic-backup-key',CRON_SECRET:'synthetic-cron'};
async function main(){
  const policy=load('src/lib/security/policy.ts');
  for(const value of ['https://evil.test','//evil.test','/\\evil.test','/admin/../../login','javascript:alert(1)','/admin\r\nlocation:'])assert.equal(policy.safeRedirect(value,'/alumno'),'/alumno');
  assert.equal(policy.safeRedirect('/alumno/tareas?q=1','/alumno'),'/alumno/tareas?q=1');
  assert.equal(policy.hasRole('alumno',policy.ADMIN_ROLES),false);
  assert.equal(policy.sameOrigin('https://evil.test','https://school.test/api'),false);
  const {temporaryPassword,passwordError}=load('src/lib/security/password.ts');
  const passwords=Array.from({length:200},()=>temporaryPassword());
  assert.equal(new Set(passwords).size,200); assert.ok(passwords.every(p=>p.length===18&&!passwordError(p)));
  assert.ok(passwordError('short'));assert.ok(passwordError('a'.repeat(129)));
  const {encryptCredentials,decryptCredentials}=load('src/lib/security/credentials.ts',{},env);
  const synthetic=[{nombre:'Fixture',matricula:'synthetic',email:'fixture@example.invalid',password:temporaryPassword()}];
  const encoded=encryptCredentials(synthetic);assert.equal(JSON.stringify(decryptCredentials(encoded)),JSON.stringify(synthetic));
  assert.ok(!encoded.includes(synthetic[0].password));assert.throws(()=>decryptCredentials(encoded.slice(0,-4)+'AAAA'));
  const {encryptBackup,decryptBackup}=load('src/lib/security/backup.ts',{'@/lib/supabase/admin':{}},env);
  const bytes=Buffer.from('synthetic backup');const backup=encryptBackup(bytes);assert.ok(decryptBackup(backup).equals(bytes));
  const tampered=Buffer.from(backup);tampered[tampered.length-1]^=1;assert.throws(()=>decryptBackup(tampered));
  const {cronAuthorized}=load('src/lib/security/secrets.ts',{},env);
  assert.equal(cronAuthorized(new Request('https://school.test/api/cron')),false);
  assert.equal(cronAuthorized(new Request('https://school.test/api/cron',{headers:{Authorization:'Bearer synthetic-cron'}})),true);
  assert.equal(load('src/lib/security/secrets.ts').cronAuthorized(new Request('https://school.test/api/cron',{headers:{Authorization:'Bearer undefined'}})),false);
  const {validateFormData}=load('src/lib/security/form-data.ts');
  const bad=new FormData();bad.set('file',new Blob(['<script>'],{type:'application/pdf'}),'fake.pdf');await assert.rejects(()=>validateFormData(bad));
  const svg=new FormData();svg.set('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'image.svg');await assert.rejects(()=>validateFormData(svg));
  const pdf=new FormData();pdf.set('file',new Blob(['%PDF-1.7'],{type:'application/pdf'}),'sample.pdf');await validateFormData(pdf);
  let identity=null,limit=true;
  const {apiAccess}=load('src/lib/security/api-access.ts',{'./access':{sessionIdentity:async()=>identity},'./rate-limit':{rateLimit:async()=>{if(limit instanceof Error)throw limit;return limit;}}});
  const request=new Request('https://school.test/api',{method:'POST',headers:{origin:'https://school.test'}});
  assert.equal((await apiAccess(request)).status,401);
  identity={user:{id:'synthetic'},profile:{rol:'alumno',debe_cambiar_password:false},aal:'aal1',needsMfa:false};
  assert.equal((await apiAccess(request,policy.ADMIN_ROLES)).status,403);
  identity.profile.rol='admin';assert.equal((await apiAccess(request)).status,403);
  identity.aal='aal2';assert.equal(await apiAccess(request),null);
  assert.equal((await apiAccess(new Request('https://school.test/api',{method:'POST',headers:{origin:'https://evil.test'}}))).status,403);
  identity.profile.debe_cambiar_password=true;assert.equal((await apiAccess(request)).status,403);identity.profile.debe_cambiar_password=false;
  limit=false;assert.equal((await apiAccess(request)).status,429);limit=Error('unavailable');assert.equal((await apiAccess(request)).status,503);
  const csp=load('src/lib/security/csp.ts').contentSecurityPolicy('synthetic-nonce','https://example.supabase.co');
  assert.ok(csp.includes("'nonce-synthetic-nonce'"));assert.ok(!csp.includes('unsafe-eval'));assert.ok(!csp.includes('fonts.googleapis.com'));
  let profile={rol:'admin',activo:true,debe_cambiar_password:false},alive=true;
  const authClient={auth:{getUser:async()=>({data:{user:{id:'synthetic'}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2',nextLevel:'aal2'}})}},rpc:async()=>({data:alive,error:null})};
  const access=load('src/lib/security/access.ts',{'react':{cache:fn=>fn},'next/navigation':{redirect:path=>{throw Error(path);}},'@/lib/supabase/server':{createClient:async()=>authClient},'@/lib/supabase/admin':{adminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile})})})})})},'./rate-limit':{rateLimit:async()=>true}});
  assert.ok(await access.sessionIdentity());alive=false;assert.equal(await access.sessionIdentity(),null);alive=true;profile.activo=false;assert.equal(await access.sessionIdentity(),null);profile.activo=true;profile.debe_cambiar_password=true;await assert.rejects(()=>access.requireIdentity(),/cambiar-password/);profile.debe_cambiar_password=false;profile.rol='alumno';await assert.rejects(()=>access.requireIdentity(),/No autorizado/);
  let guarded=0;
  const exceptions=['login/actions.ts','recuperar/actions.ts','cambiar-password/actions.ts'];
  function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else if(entry.name.endsWith('.ts')){
    const source=fs.readFileSync(file,'utf8');if(!/^['"]use server['"]/.test(source.trim()))continue;
    const relative=path.relative('src/app',file).replaceAll('\\','/');if(exceptions.includes(relative))continue;
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
    for(const statement of ast.statements){if(ts.isFunctionDeclaration(statement)&&statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)){
      assert.match(statement.body?.statements[0]?.getText(ast)??'',/await requireAccess\(/,`${relative}:${statement.name?.text} must authorize first`);guarded++;
    }}
  }}}
  visit('src/app');assert.ok(guarded>=140);
  console.log(`PASS: ${guarded} action guards; API authorization/MFA/CSRF/rate failures; redirects, password entropy, authenticated encryption, upload signatures and CSP.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
