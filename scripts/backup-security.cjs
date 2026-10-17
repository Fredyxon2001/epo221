// Creates and validates a backup; only encrypted bytes are saved locally.
if(process.argv.length!==3||process.argv[2]!=='--create'){
  console.error('Este comando crea un respaldo y aplica retención. Usar --create; para lectura offline usar verify-backup-custody.cjs.');
  process.exit(1);
}
const fs=require('node:fs'),path=require('node:path');
require('@next/env').loadEnvConfig(process.cwd());
const {load}=require('./security-loader.cjs');
async function main(){
  const {createSecurityBackup,decryptBackup}=load('src/lib/security/backup.ts',{},process.env);
  const {validateBackupManifest,verifyBackupFile}=load('src/lib/security/backup-integrity.ts');
  const result=await createSecurityBackup();
  const {adminClient}=load('src/lib/supabase/admin.ts',{},process.env);
  const client=adminClient();
  const {data,error}=await client.storage.from('security-backups').download(result.name);
  if(error||!data)throw Error('No se pudo descargar el respaldo cifrado.');
  const bytes=Buffer.from(await data.arrayBuffer());
  const manifest=validateBackupManifest(JSON.parse(require('node:zlib').gunzipSync(decryptBackup(bytes)).toString()));
  if(!/^snapshots\/[0-9T-]+Z\.json\.gz\.enc$/.test(result.name))throw Error('Nombre de respaldo inválido.');
  const directory=path.resolve('security-backups');
  fs.mkdirSync(path.join(directory,'snapshots'),{recursive:true});
  fs.mkdirSync(path.join(directory,'files'),{recursive:true});
  for(const file of manifest.files){
    const local=path.join(directory,file.object);
    if(fs.existsSync(local)){
      // A previous local copy may be incomplete or corrupt: never silently skip it.
      verifyBackupFile(decryptBackup(fs.readFileSync(local)),file);
      continue;
    }
    const {data,error}=await client.storage.from('security-backups').download(file.object);
    if(error||!data)throw Error('No se pudo conservar un archivo cifrado.');
    const encrypted=Buffer.from(await data.arrayBuffer());
    verifyBackupFile(decryptBackup(encrypted),file);
    fs.writeFileSync(local,encrypted);
    verifyBackupFile(decryptBackup(fs.readFileSync(local)),file);
  }
  // Make the local manifest available only once all referenced files passed.
  fs.writeFileSync(path.join(directory,result.name),bytes);
  const saved=fs.readFileSync(path.join(directory,result.name));
  if(!saved.equals(bytes))throw Error('La copia local del manifiesto falló.');
  console.log(JSON.stringify({...result,localEncryptedCopy:true,localIntegrityVerified:true}));
}
main().catch(()=>{console.error('No se completó la copia cifrada local; revisar integridad y acceso sin imprimir datos ni claves.');process.exitCode=1;});
