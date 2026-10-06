// Creates and validates a backup; only encrypted bytes are saved locally.
const fs=require('node:fs'),path=require('node:path');
require('@next/env').loadEnvConfig(process.cwd());
const {load}=require('./security-loader.cjs');
async function main(){
  const {createSecurityBackup,decryptBackup}=load('src/lib/security/backup.ts',{},process.env);
  const result=await createSecurityBackup();
  const {adminClient}=load('src/lib/supabase/admin.ts',{},process.env);
  const client=adminClient();
  const {data,error}=await client.storage.from('security-backups').download(result.name);
  if(error||!data)throw Error('No se pudo descargar el respaldo cifrado.');
  const bytes=Buffer.from(await data.arrayBuffer());
  const manifest=JSON.parse(require('node:zlib').gunzipSync(decryptBackup(bytes)).toString());
  const directory=path.resolve('security-backups');
  fs.mkdirSync(path.join(directory,'snapshots'),{recursive:true});
  fs.mkdirSync(path.join(directory,'files'),{recursive:true});
  fs.writeFileSync(path.join(directory,result.name),bytes);
  for(const file of manifest.files){
    const local=path.join(directory,file.object);
    if(fs.existsSync(local))continue;
    const {data,error}=await client.storage.from('security-backups').download(file.object);
    if(error||!data)throw Error('No se pudo conservar un archivo cifrado.');
    const bytes=Buffer.from(await data.arrayBuffer());
    const plain=decryptBackup(bytes);
    if(require('node:crypto').createHash('sha256').update(plain).digest('hex')!==file.sha256)throw Error('Archivo cifrado inválido.');
    fs.writeFileSync(local,bytes);
  }
  console.log(JSON.stringify({...result,localEncryptedCopy:true}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
