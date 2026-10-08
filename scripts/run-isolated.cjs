const {spawn}=require('node:child_process');
const {root,environment}=require('./isolated-stack.cjs');
const {assertIsolatedEnvironment}=require('./assert-isolated.cjs');
const args=process.argv.slice(process.argv.indexOf('--')+1);
if(!process.argv.includes('--')||!args.length)throw Error('Use -- <node script and arguments>');
const env=environment();assertIsolatedEnvironment(env);
const child=spawn(process.execPath,args,{cwd:root,env,stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
