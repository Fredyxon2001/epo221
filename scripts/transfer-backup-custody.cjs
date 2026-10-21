'use strict';
const fs=require('node:fs'),path=require('node:path');
const {exportCustody,fetchCustody}=require('./backup-custody-transfer.cjs');
async function main(argv=process.argv.slice(2),env=process.env){
 const mode=argv[0];if(!['--fetch-latest','--export'].includes(mode))throw Error('explicit-mode-required');
 const allowed=mode==='--export'?['directory','snapshot','destination']:['directory'];const values={};
 for(const arg of argv.slice(1)){const match=/^--([a-z-]+)=(.+)$/.exec(arg);if(!match||!allowed.includes(match[1])||values[match[1]])throw Error('invalid-options');values[match[1]]=match[2];}
 if(!values.directory||!env.BACKUP_ENCRYPTION_KEY)throw Error('directory-and-key-required');
 if(mode==='--export'){
  if(!values.snapshot||!values.destination)throw Error('export-input-required');
  return exportCustody({directory:values.directory,snapshot:values.snapshot,destination:values.destination,secret:env.BACKUP_ENCRYPTION_KEY});
 }
 const {createClient}=require('@supabase/supabase-js');
 if(env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvycaqghrkvspkzouape.supabase.co'||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('school-project-boundary');
 const bounded=(input,options={})=>fetch(input,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
 const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:bounded}});
 return fetchCustody({client,url:env.NEXT_PUBLIC_SUPABASE_URL,directory:values.directory,secret:env.BACKUP_ENCRYPTION_KEY});
}
module.exports={main};
if(require.main===module)main().then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('Custodia no completada: revisar modo, entradas, acceso e integridad. No se imprimen contenido, rutas privadas ni claves; copias incompletas se conservan para revision.');process.exitCode=1;});
