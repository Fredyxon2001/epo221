// Run locally. Secrets travel through stdin and never appear in command output.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
async function main() {
const {token}=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'),'utf8'));
const {projectId,orgId}=JSON.parse(fs.readFileSync('.vercel/project.json','utf8'));
if(!token)throw new Error('Vercel CLI no autenticado.');
const validKey=value=>typeof value==='string' && (/^sb_secret_[A-Za-z0-9_-]+$/.test(value)||/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value));
if(!validKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  const temporary=path.resolve('.env.vercel.local');
  const cli=path.join(process.env.APPDATA,'npm/node_modules/vercel/dist/index.js');
  const pull=require('node:child_process').spawnSync(process.execPath,[cli,'env','pull',temporary,'--environment=production','--yes'],{encoding:'utf8',windowsHide:true});
  if(pull.status!==0)throw new Error('No se pudo obtener la configuración del servidor.');
  const line=fs.readFileSync(temporary,'utf8').split(/\r?\n/).find(line=>line.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
  let secret=line?.slice(line.indexOf('=')+1).trim();
  if(secret?.startsWith('"'))secret=JSON.parse(secret);
  if(path.dirname(temporary)!==process.cwd())throw new Error('Ruta temporal inválida.');
  fs.unlinkSync(temporary);
  if(!validKey(secret))throw new Error('Falta la credencial de servidor de Supabase.');
  const current=fs.readFileSync('.env.local','utf8');
  fs.writeFileSync('.env.local',current.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*\r?\n?/gm,'')+`\nSUPABASE_SERVICE_ROLE_KEY=${secret}\n`);
  process.env.SUPABASE_SERVICE_ROLE_KEY=secret;
  console.log('Server configuration loaded into ignored local environment.');
}
for(const name of ['CRON_SECRET','CREDENTIALS_ENCRYPTION_KEY','BACKUP_ENCRYPTION_KEY']) {
  const value=process.env[name] || crypto.randomBytes(32).toString('base64url');
  if(!process.env[name]) {
    fs.appendFileSync('.env.local',`\n${name}=${value}\n`);
    process.env[name]=value;
  }
  const list=await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${orgId}`,{headers:{Authorization:`Bearer ${token}`}});
  if(!list.ok)throw new Error('No se pudo listar la configuración del proyecto.');
  const existing=(await list.json()).envs.filter(item=>item.key===name && !item.gitBranch && item.target?.some(target=>['production','preview'].includes(target))).sort((a,b)=>b.updatedAt-a.updatedAt);
  for(const duplicate of existing.slice(1)){
    const removed=await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${duplicate.id}?teamId=${orgId}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
    if(!removed.ok)throw new Error(`No se pudo eliminar la definición duplicada de ${name}.`);
  }
  const endpoint=existing.length ? `https://api.vercel.com/v9/projects/${projectId}/env/${existing[0].id}?teamId=${orgId}` : `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${orgId}`;
  const body=existing.length ? {value,target:['production','preview']} : {key:name,value,type:'sensitive',target:['production','preview']};
  const result=await fetch(endpoint,{method:existing.length?'PATCH':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!result.ok){const error=(await result.json()).error;throw new Error(`No se pudo configurar ${name}: HTTP ${result.status}, ${String(error?.message ?? error?.code).split(value).join('[redacted]').split(token).join('[redacted]')}`);}
  const current=fs.readFileSync('.env.local','utf8');
  fs.writeFileSync('.env.local',current.split(/\r?\n/).filter(line=>!line.startsWith(name+'=')).join('\n')+`\n${name}=${value}\n`);
  console.log(`${name}: configured in production and preview.`);
}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
