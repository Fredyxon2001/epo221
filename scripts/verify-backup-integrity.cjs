const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {load}=require('./security-loader.cjs');
const {verifyCustody}=require('./verify-backup-custody.cjs');
const env={BACKUP_ENCRYPTION_KEY:'synthetic-backup-integrity-only'};
const {encryptBackup,decryptBackup}=load('src/lib/security/backup.ts',{'@/lib/supabase/admin':{}},env);
const {validateBackupManifest,verifyBackupFile}=load('src/lib/security/backup-integrity.ts');
const now=Date.now(),clear=Buffer.from('synthetic public fixture bytes'),hash=crypto.createHash('sha256').update(clear).digest('hex');
const file={bucket:'synthetic',name:'fixture.txt',object:'files/'+hash+'.enc',sha256:hash,size:clear.length};
const manifest={version:1,createdAt:new Date(now).toISOString(),snapshot:{data:{synthetic:[]}},files:[file]};
const name='snapshots/'+manifest.createdAt.replace(/[:.]/g,'-')+'.json.gz.enc';

async function verifyPersistence(mode){
  const store=new Map();let retentionReads=0,removals=0,stagingRead=false;
  const client={
    rpc:async(name)=>name==='security_backup_snapshot'?{data:{storage:[{bucket_id:'synthetic',name:'fixture.txt'},{bucket_id:'security-uploads',name:'must-not-copy'}]}}:{data:{ok:true,tables:1,rows:0}},
    storage:{from:bucket=>({
      upload:async(name,bytes)=>{store.set(name,Buffer.from(bytes));return {};},
      download:async(name)=>{
        if(bucket==='security-uploads'){stagingRead=true;throw Error('staging');}
        if(bucket==='synthetic')return {data:new Blob([clear])};
        const bytes=store.get(name);
        if(name.startsWith('snapshots/')&&mode==='unavailable')return {error:{message:'synthetic'}};
        if(name.startsWith('snapshots/')&&mode==='corrupt'){const bad=Buffer.from(bytes);bad[bad.length-1]^=1;return {data:new Blob([bad])};}
        return {data:new Blob([bytes])};
      },
      list:async()=>{retentionReads++;return {data:[{name:'old.json.gz.enc',created_at:'2000-01-01T00:00:00.000Z'}]};},
      remove:async()=>{removals++;return {};}
    })}
  };
  const {createSecurityBackup}=load('src/lib/security/backup.ts',{'@/lib/supabase/admin':{adminClient:()=>client}},env);
  if(mode==='ok'){const result=await createSecurityBackup();assert.equal(result.files,1);assert.equal(retentionReads,1);assert.equal(removals,1);}
  else{await assert.rejects(()=>createSecurityBackup());assert.equal(retentionReads,0);assert.equal(removals,0);}
  assert.equal(stagingRead,false);
}
async function main(){
  const {spawnSync}=require('node:child_process');
  for(const args of [[],['--unknown']]){const rejected=spawnSync(process.execPath,['scripts/backup-security.cjs',...args],{encoding:'utf8',timeout:30000,env:{}});assert.equal(rejected.status,1);assert.match(rejected.stderr,/--create/);assert.ok(!rejected.stderr.includes('Cannot find module'));}

  assert.equal(validateBackupManifest(manifest,now).files.length,1);
  for(const change of [
    {version:2},{createdAt:'invalid'},{createdAt:new Date(now+3600000).toISOString()},
    {snapshot:null},{files:[{...file,object:'../outside.enc'}]},{files:[{...file,object:'files/wrong.enc'}]},
    {files:[{...file,size:-1}]},{files:[{...file,sha256:hash.toUpperCase()}]}
  ])assert.throws(()=>validateBackupManifest({...manifest,...change},now));
  verifyBackupFile(clear,file);assert.throws(()=>verifyBackupFile(Buffer.from('bad'),file));
  assert.throws(()=>verifyBackupFile(clear,{...file,size:clear.length+1}));
  for(const length of [0,6,18,33])assert.throws(()=>decryptBackup(Buffer.alloc(length)));
  const broken=encryptBackup(clear);broken[broken.length-1]^=1;assert.throws(()=>decryptBackup(broken));
  const wrong=load('src/lib/security/backup.ts',{'@/lib/supabase/admin':{}},{BACKUP_ENCRYPTION_KEY:'wrong'});
  assert.throws(()=>wrong.decryptBackup(encryptBackup(clear)));
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'epo221-custody-test-'));
  const snapshot=path.join(directory,name),object=path.join(directory,file.object);
  try{
    fs.mkdirSync(path.join(directory,'snapshots'));fs.mkdirSync(path.join(directory,'files'));
    fs.writeFileSync(snapshot,encryptBackup(zlib.gzipSync(Buffer.from(JSON.stringify(manifest)))));
    fs.writeFileSync(object,encryptBackup(clear));
    const run=(changes={})=>verifyCustody({directory,snapshot:name,now,decryptBackup,...changes});
    assert.equal(run().ok,true);assert.equal(run().files,1);assert.equal(run().authRecovered,false);
    assert.equal(run().offsiteCustodyVerified,false);
    assert.equal(run({now:now+36*3600000}).fresh,true);
    assert.equal(run({now:now+36*3600000+1}).fresh,false);
    assert.throws(()=>run({snapshot:'../outside.enc'}));assert.throws(()=>run({maxAgeHours:0}));
    const saved=fs.readFileSync(object);fs.writeFileSync(object,encryptBackup(Buffer.from('corrupted existing cache')));
    assert.throws(()=>run());fs.writeFileSync(object,saved);
    fs.unlinkSync(object);assert.throws(()=>run());fs.writeFileSync(object,saved);
    const archived=fs.readFileSync(snapshot);fs.writeFileSync(snapshot,Buffer.from('truncated'));assert.throws(()=>run());fs.writeFileSync(snapshot,archived);
    const report=JSON.stringify(run());assert.ok(!report.includes(file.name));assert.ok(!report.includes(file.bucket));assert.ok(!report.includes(env.BACKUP_ENCRYPTION_KEY));
  }finally{
    for(const target of [snapshot,object])if(fs.existsSync(target))fs.unlinkSync(target);
    fs.rmdirSync(path.join(directory,'snapshots'));fs.rmdirSync(path.join(directory,'files'));fs.rmdirSync(directory);
  }
  await verifyPersistence('ok');await verifyPersistence('corrupt');await verifyPersistence('unavailable');
  console.log('PASS backup integrity: persisted snapshot verified before retention; corrupt/missing storage blocks pruning; cached byte hashes/sizes, authenticated encryption, offline custody freshness/boundaries and private output.');
}
main().catch(()=>{console.error('FAIL synthetic backup integrity verification; no school data or production credentials were used.');process.exitCode=1;});
