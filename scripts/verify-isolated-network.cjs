const assert=require('node:assert/strict');
const {validateOwned,loopbackOnly,assertLoopbackBindings,recreateSpec}=require('./isolated-network.cjs');
const project='epo221-isolated',network='epo221-isolated-local';
function fixture(kind,port,hostPort){
  return {Id:'a'.repeat(64),Name:'/supabase_'+kind+'_'+project,
    Config:{Image:'synthetic-image',Env:['PRIVATE_SYNTHETIC_ONLY=value'],Labels:{'com.supabase.cli.project':project},Healthcheck:{Test:['CMD','true']}},
    HostConfig:{PortBindings:{[port]:[{HostIp:'127.0.0.1',HostPort:hostPort}]},Binds:['synthetic-volume:/data']},
    NetworkSettings:{Ports:{[port]:[{HostIp:'127.0.0.1',HostPort:hostPort}]},Networks:{[network]:{NetworkID:'own-network',Aliases:['fixture','a'.repeat(12)]}}},
    State:{Running:true,Health:{Status:'healthy'}}};
}
const db=fixture('db','5432/tcp','55432'),kong=fixture('kong','8000/tcp','55431');
assertLoopbackBindings([db,kong]);
for(const host of ['','0.0.0.0','::','192.0.2.1']){
  const bad=structuredClone(db);bad.NetworkSettings.Ports['5432/tcp'][0].HostIp=host;
  assert.equal(loopbackOnly(bad),false);assert.throws(()=>assertLoopbackBindings([bad,kong]));
}
const stale=structuredClone(db);stale.HostConfig.PortBindings['5432/tcp'][0].HostIp='';
assert.equal(loopbackOnly(stale),false);
const rebuilt=recreateSpec(stale);assert.equal(rebuilt.body.HostConfig.PortBindings['5432/tcp'][0].HostIp,'127.0.0.1');
assert.deepEqual(rebuilt.body.HostConfig.Binds,db.HostConfig.Binds);assert.deepEqual(rebuilt.body.Env,db.Config.Env);
assert.deepEqual(rebuilt.body.Healthcheck,db.Config.Healthcheck);assert.deepEqual(rebuilt.body.NetworkingConfig.EndpointsConfig[network].Aliases,['fixture']);
assert.equal(stale.HostConfig.PortBindings['5432/tcp'][0].HostIp,'');
for(const change of [{Name:'/unrelated'},{Config:{Labels:{'com.supabase.cli.project':'other'}}},{HostConfig:{PortBindings:{'5432/tcp':[{HostIp:'',HostPort:'5432'}]}}}]){
  assert.throws(()=>validateOwned({...db,...change}));
}
assert.throws(()=>assertLoopbackBindings([db]));
console.log('PASS isolated Docker binding guards: IPv4/IPv6/all-interface reject, own project/ports only, config/healthcheck/named volumes preserved, no mutation of original metadata.');
