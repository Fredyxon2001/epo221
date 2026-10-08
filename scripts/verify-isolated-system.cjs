// Runs existing full school flows only against the own local Supabase stack.
const {spawn,execFileSync}=require('node:child_process'),path=require('node:path');
const {root,start,stop,environment}=require('./isolated-stack.cjs');
const {assertIsolatedEnvironment}=require('./assert-isolated.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));let server;
async function main(){try{
 await start();const env=environment();assertIsolatedEnvironment(env);
 execFileSync(process.execPath,['scripts/apply-isolated-schema.cjs'],{cwd:root,env,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/verify-full-recovery.cjs','--isolated'],{cwd:root,env,timeout:300000,stdio:'inherit'});
 server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3004'],{cwd:root,env,detached:process.platform!=='win32',windowsHide:true,stdio:['ignore','pipe','pipe']});
 // Keep logs in memory only; Next diagnostics can contain request/session material.
 server.stdout.on('data',()=>{});server.stderr.on('data',()=>{});
 let ready=false;for(let i=0;i<90;i++){try{const response=await fetch(env.FLOW_BASE_URL+'/login',{signal:AbortSignal.timeout(10000)});if(response.status===200){ready=true;break;}}catch{}await pause(1000);}if(!ready)throw Error('Isolated web server not ready');
 console.log('PASS isolated web server ready; production .env files bypassed.');
 const flows=[
  ['scripts/verify-academic-flows.cjs','--live'],
  ['scripts/verify-financial-flows.cjs','--live'],
  ['scripts/verify-mobile-flows.cjs','--live'],
  ['scripts/verify-browser-flows.cjs','--live'],
  ['scripts/verify-operation-isolated.cjs','--browser'],
  ['scripts/verify-public-metrics-isolated.cjs','--web'],
  ['scripts/verify-public-axe.cjs'],
  ['scripts/verify-metrics-consent-browser.cjs'],
  ['scripts/verify-cookie-map-isolated.cjs'],
 ];
 for(const args of flows){console.log('Verifying isolated '+args[0]);execFileSync(process.execPath,args,{cwd:root,env,timeout:1200000,stdio:'inherit'});}
 console.log('PASS isolated academic/financial/mobile/browser school flows.');
}finally{if(server?.pid&&server.exitCode===null&&server.signalCode===null){try{if(process.platform==='win32')execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else process.kill(-server.pid,'SIGTERM');}catch{/* Own server already exited. */}}if(!process.argv.includes('--keep-stack'))stop();}}
main().catch(()=>{console.error('Isolated school flow suite failed; review the last named check. No production endpoint was used.');process.exitCode=1;});
