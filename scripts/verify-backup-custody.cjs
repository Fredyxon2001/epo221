// Offline only. No env-file loading, network, restoration, or plaintext exports.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {load}=require('./security-loader.cjs');

function verifyCustody({directory,snapshot,maxAgeHours=36,now=Date.now(),decryptBackup}){
  const {validateBackupManifest,verifyBackupFile,backupAgeHours}=load('src/lib/security/backup-integrity.ts');
  if(!Number.isFinite(maxAgeHours)||maxAgeHours<=0||maxAgeHours>8760)throw Error('invalid-policy');
  if(!/^snapshots\/[0-9T-]+Z\.json\.gz\.enc$/.test(snapshot))throw Error('invalid-snapshot');
  const root=fs.realpathSync(directory),inside=relative=>{
    const target=fs.realpathSync(path.join(root,relative)),rel=path.relative(root,target);
    if(rel.startsWith('..'+path.sep)||rel==='..'||path.isAbsolute(rel))throw Error('outside-custody');
    return target;
  };
  const manifest=validateBackupManifest(JSON.parse(zlib.gunzipSync(decryptBackup(fs.readFileSync(inside(snapshot)))).toString('utf8')),now);
  let bytes=0;
  for(const file of manifest.files){
    const clear=decryptBackup(fs.readFileSync(inside(file.object)));
    verifyBackupFile(clear,file);bytes+=clear.length;
  }
  const ageHours=backupAgeHours(manifest,now);
  return {ok:ageHours<=maxAgeHours,integrityVerified:true,fresh:ageHours<=maxAgeHours,
    ageHours:Math.round(ageHours*100)/100,maxAgeHours,files:manifest.files.length,fileBytes:bytes,
    scope:'application-only',authRecovered:false,providerRecovered:false,offsiteCustodyVerified:false};
}
module.exports={verifyCustody};
if(require.main===module){
  try{
    const options=process.argv.slice(2);
    if(options.some(a=>!/^--(snapshot|directory|max-age-hours)=.+$/.test(a)))throw Error('invalid-options');
    const get=key=>options.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3);
    const snapshot=get('snapshot');
    if(!snapshot||!process.env.BACKUP_ENCRYPTION_KEY)throw Error('missing-input');
    const {decryptBackup}=load('src/lib/security/backup.ts',{'@/lib/supabase/admin':{}},process.env);
    const report=verifyCustody({directory:get('directory')||path.resolve('security-backups'),snapshot,
      maxAgeHours:Number(get('max-age-hours')||36),decryptBackup});
    console.log(JSON.stringify(report));
    if(!report.ok)process.exitCode=2;
  }catch{
    console.error(JSON.stringify({ok:false,integrityVerified:false,error:'Respaldo ausente, inválido, incompleto o clave no disponible; revisar custodia sin imprimir contenido.'}));
    process.exitCode=1;
  }
}
