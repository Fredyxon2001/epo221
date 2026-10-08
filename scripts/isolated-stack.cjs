// Local Supabase only. Never links a hosted project or reads production secrets/data.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),work=path.join(root,'.qa','stack'),project='epo221-isolated',network='epo221-isolated-local';
const cli=path.join(root,'node_modules','supabase','dist','supabase.js');
function run(args){try{return execFileSync(process.execPath,[cli,...args,'--workdir',work],{cwd:root,encoding:'utf8',timeout:1200000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}catch(e){const safe=String(e.stderr??'').split(/\r?\n/).filter(l=>/^(Error|failed|Unable|unknown|invalid|permission|Cannot|OCI)/i.test(l)&&!/(key|token|password|secret|eyJ)/i.test(l)).slice(-2).join(' ').replace(/https?:\/\/\S+/g,'[remote address]');throw Error('Isolated Supabase '+args[0]+' failed (status '+e.status+'). '+safe);}}
function docker(args,input){try{return execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']});}catch(e){const safe=String(e.stderr??'').split(/\r?\n/).filter(l=>/^ERROR:/.test(l)&&!/(key|token|password|secret|eyJ|cookie)/i.test(l)).slice(0,2).join(' ');throw Error('Isolated Docker '+args[0]+' failed (status '+e.status+'). '+safe);}}
function sql(statement){return docker(['exec','-i','supabase_db_'+project,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-qAt'],statement);}
function status(){const info=JSON.parse(run(['status','--output','json']));const url=new URL(info.API_URL);if(!['127.0.0.1','localhost'].includes(url.hostname)||url.protocol!=='http:'||url.port!=='55431')throw Error('Local endpoint safety check failed');return info;}
function environment(){const info=status();return {...process.env,__NEXT_PROCESSED_ENV:'true',EPO_ISOLATED_TEST:'1',NEXT_PUBLIC_SUPABASE_URL:info.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:info.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:info.SERVICE_ROLE_KEY,NEXT_PUBLIC_APP_URL:'http://localhost:3004',EXPO_NO_DOTENV:'1',EXPO_PUBLIC_SUPABASE_URL:info.API_URL,EXPO_PUBLIC_SUPABASE_ANON:info.ANON_KEY,EXPO_PUBLIC_WEB_URL:'http://localhost:3004',QA_SUPABASE_URL:info.API_URL,QA_SUPABASE_ANON:info.ANON_KEY,QA_SUPABASE_SERVICE_ROLE:info.SERVICE_ROLE_KEY,QA_MOBILE_URL:'http://localhost:8094',FLOW_BASE_URL:'http://localhost:3004',FLOW_BUILD_DIR:'.qa/next/dev',VAPID_PRIVATE_KEY:'isolated-no-push',NEXT_PUBLIC_VAPID_PUBLIC_KEY:'',CRON_SECRET:'isolated-cron-'+project,CREDENTIALS_ENCRYPTION_KEY:'isolated-credentials-'+project,BACKUP_ENCRYPTION_KEY:'isolated-backup-'+project};}
function stop(){if(!fs.existsSync(path.join(work,'supabase','config.toml')))return;run(['stop','--project-id',project,'--no-backup']);try{docker(['network','rm',network]);}catch{}console.log('PASS own local Supabase stopped and disposable volumes removed.');}
async function start(){
 fs.mkdirSync(work,{recursive:true});const config=path.join(work,'supabase','config.toml');
 if(!fs.existsSync(config)){
  run(['init','--yes']);let text=fs.readFileSync(config,'utf8').replace(/^project_id\s*=.*$/m,'project_id = "'+project+'"');
  for(const [a,b]of[[54321,55431],[54322,55432],[54320,55430],[54323,55433],[54324,55434],[54327,55437],[54329,55439]])text=text.replaceAll(String(a),String(b));
  text=text.replace('site_url = "http://127.0.0.1:3000"','site_url = "http://localhost:3004"');
  text=text.replace('additional_redirect_urls = ["https://127.0.0.1:3000"]','additional_redirect_urls = ["http://localhost:3004/**"]');
  text=text.replace(/(\[auth\.mfa\.totp\][\s\S]*?enroll_enabled = )false/,'$1true').replace(/(\[auth\.mfa\.totp\][\s\S]*?verify_enabled = )false/,'$1true');
  fs.writeFileSync(config,text);
 }
 if(!fs.readFileSync(config,'utf8').includes('project_id = "'+project+'"'))throw Error('Unsafe existing isolated config');
 try{docker(['network','inspect',network]);}catch{docker(['network','create','-o','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',network]);}
 console.log('Starting only the own loopback Supabase stack; initial image downloads may take several minutes.');
 run(['start','--network-id',network,'--exclude','realtime,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit']);
 const info=status();if(!info.ANON_KEY||!info.SERVICE_ROLE_KEY)throw Error('Local legacy JWT keys required for existing clients');
 console.log('PASS local Auth/Postgres/REST/Storage ready on loopback55431; no keys printed.');
}
module.exports={root,work,project,network,run,docker,sql,status,environment,start,stop};
if(require.main===module)(async()=>{if(process.argv.includes('--stop'))stop();else if(process.argv.includes('--start'))await start();else throw Error('Use --start or --stop');})().catch(e=>{console.error(e.message);process.exitCode=1;});
