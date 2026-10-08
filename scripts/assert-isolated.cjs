// Refuse any production endpoint before fixture creation or destructive rehearsal.
const assert=require('node:assert/strict');
function assertIsolatedEnvironment(env=process.env){
 assert.equal(env.EPO_ISOLATED_TEST,'1','Isolated mode required');
 const api=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
 assert.ok(['localhost','127.0.0.1'].includes(api.hostname)&&api.protocol==='http:'&&api.port==='55431','Only own loopback Supabase55431 allowed');
 for(const name of ['FLOW_BASE_URL','NEXT_PUBLIC_APP_URL'])if(env[name]){const u=new URL(env[name]);assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:','Remote web endpoints forbidden');}
 for(const [name,role]of[['NEXT_PUBLIC_SUPABASE_ANON_KEY','anon'],['SUPABASE_SERVICE_ROLE_KEY','service_role']]){
  const key=env[name];assert.ok(key,'Local JWT key required');let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));}catch{throw Error('Invalid local JWT role');}
  assert.equal(claims.role,role);assert.ok(!claims.ref||claims.ref==='epo221-isolated','Hosted project JWT forbidden');
 }
 return true;
}
module.exports={assertIsolatedEnvironment};
