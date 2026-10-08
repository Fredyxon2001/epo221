const fs=require('node:fs'),path=require('node:path');
const {root,sql,environment}=require('./isolated-stack.cjs');
const {assertIsolatedEnvironment}=require('./assert-isolated.cjs');
assertIsolatedEnvironment(environment());
try{
 if(sql("select to_regclass('public.perfiles') is null;").trim()==='t'){
  sql(fs.readFileSync(path.join(root,'supabase/baseline.sql'),'utf8'));
  console.log('PASS complete application baseline installed locally.');
 }
 sql('CREATE TABLE IF NOT EXISTS public.epo_isolated_migrations(name text primary key); REVOKE ALL ON public.epo_isolated_migrations FROM PUBLIC,anon,authenticated;');
 for(const file of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d{14}_.*\.sql$/.test(f)&&f>'20261007030624_private_public_documents.sql').sort()){
  const applied=sql("select count(*) from public.epo_isolated_migrations where name='"+file+"';").trim();
  if(applied==='0'){sql('BEGIN;\n'+fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')+"\nINSERT INTO public.epo_isolated_migrations VALUES ('"+file+"'); COMMIT;");console.log('PASS local migration '+file);}
 }
 sql("NOTIFY pgrst,'reload schema';");
}catch(e){console.error('Isolated schema installation failed; no remote database was touched. '+e.message);process.exitCode=1;}
