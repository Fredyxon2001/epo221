// Docker Desktop can ignore bridge default bindings. Inspect actual published
// addresses and explicitly bind only this disposable project's DB/API containers.
const {execFileSync}=require('node:child_process'),http=require('node:http');
const project='epo221-isolated',network='epo221-isolated-local';
const expected={
  ['supabase_db_'+project]:{'5432/tcp':'55432'},
  ['supabase_kong_'+project]:{'8000/tcp':'55431'}
};
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}catch{throw Error('Own isolated Docker inspection failed.');}}
function inspect(name){return JSON.parse(docker(['inspect',name]))[0];}
function validateOwned(container){
  const name=container.Name?.replace(/^\//,'');
  if(!expected[name]||container.Config?.Labels?.['com.supabase.cli.project']!==project||
     !container.NetworkSettings?.Networks?.[network])throw Error('Refusing to change an unrelated container.');
  const bindings=container.HostConfig?.PortBindings??{},ports=expected[name];
  if(Object.keys(bindings).length!==Object.keys(ports).length)throw Error('Unexpected isolated published port.');
  for(const [port,hostPort]of Object.entries(ports)){
    if(!Array.isArray(bindings[port])||bindings[port].length!==1||bindings[port][0].HostPort!==hostPort)throw Error('Unexpected isolated published port.');
  }
  return name;
}
function loopbackOnly(container){
  const name=validateOwned(container),requested=container.HostConfig.PortBindings,actual=container.NetworkSettings.Ports??{};
  if(!container.State?.Running)return false;
  for(const [port,hostPort]of Object.entries(expected[name])){
    if(requested[port].some(b=>b.HostIp!=='127.0.0.1'))return false;
    if(!actual[port]?.length||actual[port].some(b=>b.HostIp!=='127.0.0.1'||b.HostPort!==hostPort))return false;
  }
  return Object.entries(actual).every(([port,bindings])=>!bindings?.length||Object.hasOwn(expected[name],port));
}
function assertLoopbackBindings(containers){
  if(containers.length!==Object.keys(expected).length)throw Error('Isolated published container inventory incomplete.');
  for(const name of Object.keys(expected))if(!containers.some(c=>c.Name==='/'+name&&loopbackOnly(c)))throw Error('Isolated Docker ports are not bound exclusively to loopback; refuse fixtures.');
}
function socketPath(){
  // The Docker context is queried without credentials. Never contact a TCP engine.
  const host=process.env.DOCKER_HOST||JSON.parse(docker(['context','inspect','--format','{{json .Endpoints.docker.Host}}']));
  if(host.startsWith('npipe:////./pipe/'))return '\\\\.\\pipe\\'+host.slice('npipe:////./pipe/'.length);
  if(host.startsWith('unix://'))return host.slice(7);
  throw Error('Only a local Docker named pipe or Unix socket is supported.');
}
function request(socket,method,url,body){
  const encoded=body===undefined?undefined:Buffer.from(JSON.stringify(body));
  return new Promise((resolve,reject)=>{
    const req=http.request({socketPath:socket,method,path:url,headers:encoded?{'content-type':'application/json','content-length':encoded.length}:{}},res=>{
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>2*1024*1024){req.destroy();reject(Error('Docker response too large.'));}else chunks.push(chunk);});
      res.on('end',()=>{if(res.statusCode>=200&&res.statusCode<300){const text=Buffer.concat(chunks).toString();try{resolve(text?JSON.parse(text):{});}catch{reject(Error('Invalid Docker response.'));}}else reject(Error('Own container Docker request failed (HTTP '+res.statusCode+').'));});
    });
    req.setTimeout(120000,()=>req.destroy(Error('Own Docker request timed out.')));
    req.on('error',()=>reject(Error('Local Docker engine request failed.')));
    if(encoded)req.write(encoded);req.end();
  });
}
function injectedGatewayConfig(container){
  const name=validateOwned(container);
  if(name!=='supabase_kong_'+project)return null;
  const setting=(container.Config.Env??[]).find(value=>value.startsWith('KONG_DECLARATIVE_CONFIG='));
  const location=setting?.slice('KONG_DECLARATIVE_CONFIG='.length);
  if(location!=='/home/kong/kong.yml')throw Error('Unexpected gateway configuration path.');
  try{return execFileSync('docker',['cp',container.Id+':/home/kong/.','-'],{timeout:120000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});}
  catch{throw Error('Could not preserve the own gateway configuration.');}
}
function restoreGatewayConfig(id,archive){
  if(!archive)return;
  try{execFileSync('docker',['cp','-',id+':/home/kong/'],{input:archive,timeout:120000,stdio:['pipe','ignore','pipe']});}
  catch{throw Error('Could not restore the own gateway configuration.');}
}
function recreateSpec(container){
  const name=validateOwned(container),host=structuredClone(container.HostConfig);
  for(const bindings of Object.values(host.PortBindings))for(const binding of bindings)binding.HostIp='127.0.0.1';
  const endpoints={};
  for(const [key,value]of Object.entries(container.NetworkSettings.Networks)){
    if(key!==network)throw Error('Unexpected network attached to isolated container.');
    endpoints[key]={NetworkID:value.NetworkID,Aliases:(value.Aliases??[]).filter(alias=>alias!==container.Id&&alias!==container.Id?.slice(0,12))};
  }
  // Config includes Env and healthcheck in memory only; never persist/print it.
  return {name,body:{...structuredClone(container.Config),HostConfig:host,NetworkingConfig:{EndpointsConfig:endpoints}}};
}
async function ensureLoopbackBindings(){
  for(const name of Object.keys(expected)){
    const before=inspect(name);validateOwned(before);
    if(loopbackOnly(before))continue;
    const socket=socketPath(),version=await request(socket,'GET','/version');
    if(!/^1\.\d+$/.test(version.ApiVersion))throw Error('Unexpected Docker API version.');
    const gatewayConfig=injectedGatewayConfig(before);
    const base='/v'+version.ApiVersion,spec=recreateSpec(before),previous=name+'_loopback_previous_'+before.Id.slice(0,8);
    await request(socket,'POST',base+'/containers/'+before.Id+'/stop?t=20');
    await request(socket,'POST',base+'/containers/'+before.Id+'/rename?name='+encodeURIComponent(previous));
    let created;
    try{
      created=await request(socket,'POST',base+'/containers/create?name='+encodeURIComponent(name),spec.body);
      restoreGatewayConfig(created.Id,gatewayConfig);
      await request(socket,'POST',base+'/containers/'+created.Id+'/start');
      let ready=false;
      for(let attempt=0;attempt<90;attempt++){
        const current=inspect(name);
        if(!current.State.Running)break;
        if(!current.State.Health||current.State.Health.Status==='healthy'){ready=true;break;}
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
      if(!ready||!loopbackOnly(inspect(name)))throw Error('Explicit loopback container failed health or binding verification.');
      await request(socket,'DELETE',base+'/containers/'+before.Id);
    }catch{
      // Fail closed. Preserve the previous stopped container and named volumes.
      if(created?.Id)try{await request(socket,'POST',base+'/containers/'+created.Id+'/stop?t=10');}catch{}
      throw Error('Own isolated container could not be rebound safely; it remains stopped with its volumes preserved.');
    }
  }
  assertLoopbackBindings(Object.keys(expected).map(inspect));
}
function assertCurrentLoopback(){assertLoopbackBindings(Object.keys(expected).map(inspect));}
module.exports={validateOwned,loopbackOnly,assertLoopbackBindings,recreateSpec,ensureLoopbackBindings,assertCurrentLoopback};
if(require.main===module)ensureLoopbackBindings().then(()=>console.log('PASS own isolated API/DB healthy and explicitly bound to127.0.0.1; volumes preserved; no credentials printed.')).catch(error=>{console.error(error.message);process.exitCode=1;});
