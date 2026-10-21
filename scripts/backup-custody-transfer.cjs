// Explicit, bounded custody transfer. Ciphertext only on disk; never a hosted restore.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {verifyCustody}=require('./verify-backup-custody.cjs');
const {load}=require('./security-loader.cjs');
const ROOT=path.resolve(__dirname,'..'),PROJECT='hvycaqghrkvspkzouape';
const SNAPSHOT=/^snapshots\/\d{4}-\d{2}-\d{2}T[\d-]+Z\.json\.gz\.enc$/;
const MAX_MANIFEST=4*1024*1024,MAX_FILE=128*1024*1024,MAX_TOTAL=256*1024*1024,MAX_FILES=2048;
const inside=(root,file)=>{const relative=path.relative(root,file);return !path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);};
function cryptoTools(secret){if(!secret)throw Error('missing-backup-key');return load('src/lib/security/backup.ts',{'@/lib/supabase/admin':{}},{BACKUP_ENCRYPTION_KEY:secret});}
function manifestFrom(bytes,decrypt,now){
 if(bytes.length>MAX_MANIFEST)throw Error('manifest-limit');
 const value=JSON.parse(zlib.gunzipSync(decrypt(bytes),{maxOutputLength:32*1024*1024}).toString('utf8'));
 const {validateBackupManifest,backupAgeHours}=load('src/lib/security/backup-integrity.ts');
 const manifest=validateBackupManifest(value,now);
 if(manifest.files.length>MAX_FILES||manifest.files.some(f=>f.size>MAX_FILE)||manifest.files.reduce((n,f)=>n+f.size,0)>MAX_TOTAL)throw Error('custody-limit');
 if(backupAgeHours(manifest,now)>36)throw Error('stale-backup');
 return manifest;
}
function existingRoot(directory){const root=fs.realpathSync(directory);if(!fs.statSync(root).isDirectory())throw Error('custody-directory');return root;}
function readCipher(root,relative,maximum){
 const file=fs.realpathSync(path.join(root,relative));if(!inside(root,file)||!fs.statSync(file).isFile()||fs.statSync(file).size>maximum)throw Error('cipher-boundary');return fs.readFileSync(file);
}
function writeImmutable(root,relative,bytes){
 const file=path.join(root,relative),parent=fs.realpathSync(path.dirname(file));if(!inside(root,parent))throw Error('cipher-boundary');
 if(fs.existsSync(file)){if(!readCipher(root,relative,bytes.length).equals(bytes))throw Error('existing-cipher-differs');return;}
 fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});if(!readCipher(root,relative,bytes.length).equals(bytes))throw Error('cipher-readback');
}
function exportCustody({directory,snapshot,destination,secret,now=Date.now()}){
 if(!SNAPSHOT.test(snapshot))throw Error('snapshot-boundary');
 const source=existingRoot(directory),parent=existingRoot(path.dirname(path.resolve(destination))),name=path.basename(destination);
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(name))throw Error('destination-name');
 const target=path.join(parent,name),workspace=fs.realpathSync(path.resolve(ROOT,'..'));
 if(inside(workspace,target)||inside(source,target)||inside(target,source)||fs.existsSync(target))throw Error('destination-must-be-new-and-external');
 const {decryptBackup}=cryptoTools(secret),bytes=readCipher(source,snapshot,MAX_MANIFEST),manifest=manifestFrom(bytes,decryptBackup,now);
 // Bound actual ciphertext sizes before the independent verifier reads them.
 for(const f of manifest.files)readCipher(source,f.object,MAX_FILE+34);
 const before=verifyCustody({directory:source,snapshot,now,decryptBackup});if(!before.ok)throw Error('source-unverified');
 fs.mkdirSync(target,{mode:0o700});
 if(process.platform==='win32'){
  const cp=require('node:child_process'),options={encoding:'utf8',timeout:15000,windowsHide:true,stdio:['ignore','pipe','pipe']};
  const sid=cp.execFileSync('whoami',['/user','/fo','csv','/nh'],options).match(/S-1-[0-9-]+/)?.[0];if(!sid)throw Error('private-directory-owner');
  cp.execFileSync('icacls',[target,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F','*S-1-5-18:(OI)(CI)F'],options);
 }
 fs.mkdirSync(path.join(target,'snapshots'));fs.mkdirSync(path.join(target,'files'));
 // A failed copy deliberately remains as incomplete evidence; never recursively delete a caller's destination.
 for(const f of manifest.files)writeImmutable(target,f.object,readCipher(source,f.object,MAX_FILE+34));
 writeImmutable(target,snapshot,bytes);
 const after=verifyCustody({directory:target,snapshot,now,decryptBackup});if(!after.ok)throw Error('copy-unverified');
 const receipt={schema:1,scope:'application-only',encryptedOnly:true,snapshot,manifestCipherSha256:crypto.createHash('sha256').update(bytes).digest('hex'),files:after.files,integrityVerified:true,fresh:true,exportedAt:new Date(now).toISOString(),authRecovered:false,providerRecovered:false,offsiteCustodyVerified:false};
 fs.writeFileSync(path.join(target,'custody-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});return receipt;
}
async function fetchCustody({client,url,directory,secret,now=Date.now()}){
 if(url!=='https://'+PROJECT+'.supabase.co')throw Error('school-project-boundary');
 const root=existingRoot(directory),{decryptBackup}=cryptoTools(secret),bucket=client.storage.from('security-backups');
 const listed=await bucket.list('snapshots',{limit:32,sortBy:{column:'created_at',order:'desc'}});if(listed.error)throw Error('snapshot-list-unavailable');
 const candidates=(listed.data||[]).filter(x=>SNAPSHOT.test('snapshots/'+x.name)&&Number.isFinite(Date.parse(x.created_at))&&Date.parse(x.created_at)<=now+300000).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 if(!candidates.length)throw Error('snapshot-absent');const snapshot='snapshots/'+candidates[0].name;
 async function download(name,maximum){const r=await bucket.download(name);if(r.error||!r.data||r.data.size>maximum)throw Error('cipher-download');const b=Buffer.from(await r.data.arrayBuffer());if(b.length>maximum)throw Error('cipher-limit');return b;}
 const bytes=await download(snapshot,MAX_MANIFEST),manifest=manifestFrom(bytes,decryptBackup,now),{verifyBackupFile}=load('src/lib/security/backup-integrity.ts');
 for(const name of ['files','snapshots']){const dir=path.join(root,name);if(!fs.existsSync(dir))fs.mkdirSync(dir,{mode:0o700});if(!inside(root,fs.realpathSync(dir)))throw Error('cipher-boundary');}
 for(const f of manifest.files){let encrypted;try{encrypted=readCipher(root,f.object,MAX_FILE+34);}catch(e){if(e.code!=='ENOENT')throw e;encrypted=await download(f.object,MAX_FILE+34);}verifyBackupFile(decryptBackup(encrypted),f);writeImmutable(root,f.object,encrypted);}
 writeImmutable(root,snapshot,bytes);const proof=verifyCustody({directory:root,snapshot,now,decryptBackup});if(!proof.ok)throw Error('download-unverified');
 return {snapshot,...proof,network:'read-only',hostedWrites:0,retentionApplied:false};
}
module.exports={exportCustody,fetchCustody};
