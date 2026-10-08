// Build a reproducible application schema from metadata; no application data is exported.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const catalogPath=process.argv.find(a=>a.startsWith('--catalog='))?.slice(10);
if(!catalogPath)throw Error('Requires --catalog=<metadata JSON>');
const c=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const q=v=>'"'+v.replaceAll('"','""')+'"',lit=v=>"'"+v.replaceAll("'","''")+"'";
const role=r=>r==='PUBLIC'?'PUBLIC':q(r);
const out=[`-- EPO221 application baseline: metadata snapshot 2026-10-07.
-- ONLY for a fresh isolated Supabase; never apply this baseline on production.
-- Auth/Storage schemas are supplied by the Supabase services, not invented here.
-- Includes existing RLS, grants, functions, constraints, indexes and triggers.
-- Apply only later migrations after 20261007030624; earlier migrations are already included.
SET search_path=public,extensions;
SET check_function_bodies=false;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;`];
for(const e of c.enums)out.push('CREATE TYPE public.'+q(e.name)+' AS ENUM ('+e.labels.map(lit).join(',')+');');
for(const t of c.tables){
 const cols=t.columns.map(a=>{
  let s=q(a.name)+' '+a.type;
  if(a.generated)s+=' GENERATED ALWAYS AS ('+a.default+') STORED';
  else if(a.identity||a.default?.startsWith('nextval('))s+=' GENERATED '+(a.identity==='a'?'ALWAYS':'BY DEFAULT')+' AS IDENTITY';
  if(!a.nullable)s+=' NOT NULL';return s;
 });
 out.push('CREATE TABLE public.'+q(t.name)+' ('+cols.join(',\n')+');');
}
for(const f of c.functions)out.push(f.def+';');
for(const t of c.tables){
 for(const a of t.columns.filter(a=>a.default&&!a.generated&&!a.identity&&!a.default.startsWith('nextval(')))out.push('ALTER TABLE public.'+q(t.name)+' ALTER COLUMN '+q(a.name)+' SET DEFAULT '+a.default+';');
 for(const k of t.constraints.filter(k=>k.kind!=='f'))out.push('ALTER TABLE public.'+q(t.name)+' ADD CONSTRAINT '+q(k.name)+' '+k.def+';');
}
const pending=[...c.views],done=new Set();
while(pending.length){
 const v=pending.find(v=>c.views.every(d=>d.name===v.name||!new RegExp('\\b'+d.name+'\\b').test(v.def)||done.has(d.name)));
 assert.ok(v,'View dependency cycle requires explicit ordering');
 const options=v.options?.length?' WITH ('+v.options.join(',')+')':'';
 out.push('CREATE VIEW public.'+q(v.name)+options+' AS '+v.def.trim().replace(/;$/,'')+';');done.add(v.name);pending.splice(pending.indexOf(v),1);
}
for(const t of c.tables){
 for(const k of t.constraints.filter(k=>k.kind==='f'))out.push('ALTER TABLE public.'+q(t.name)+' ADD CONSTRAINT '+q(k.name)+' '+k.def+';');
 for(const index of t.indexes)out.push(index.def+';');
 if(t.rls)out.push('ALTER TABLE public.'+q(t.name)+' ENABLE ROW LEVEL SECURITY;');
}
for(const trigger of c.triggers)out.push(trigger+';');
for(const trigger of c.externalTriggers??[])out.push(trigger+';');
for(const p of c.policies)out.push('CREATE POLICY '+q(p.name)+' ON public.'+q(p.table)+' AS '+p.permissive+' FOR '+p.cmd+' TO '+p.roles.map(role).join(',')+(p.qual?' USING ('+p.qual+')':'')+(p.check?' WITH CHECK ('+p.check+')':'')+';');
for(const b of c.buckets??[])out.push('INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('+lit(b.id)+','+lit(b.name)+','+Boolean(b.public)+','+(b.limit??'NULL')+','+(b.mimes?'ARRAY['+b.mimes.map(lit).join(',')+']::text[]':'NULL')+') ON CONFLICT(id) DO NOTHING;');
for(const p of c.storagePolicies??[])out.push('CREATE POLICY '+q(p.name)+' ON storage.'+q(p.table)+' AS '+p.permissive+' FOR '+p.cmd+' TO '+p.roles.map(role).join(',')+(p.qual?' USING ('+p.qual+')':'')+(p.check?' WITH CHECK ('+p.check+')':'')+';');
// Local Supabase defaults must not silently broaden production column/table privileges.
out.push('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;');
for(const g of c.grants)out.push('GRANT '+g.privilege+' ON public.'+q(g.table)+' TO '+role(g.role)+';');
for(const g of c.columnGrants)out.push('GRANT '+g.privilege+' ('+q(g.column)+') ON public.'+q(g.table)+' TO '+role(g.role)+';');
for(const f of c.functions)out.push('REVOKE ALL ON FUNCTION '+f.signature+' FROM PUBLIC,anon,authenticated,service_role;');
for(const g of c.functionGrants)out.push('GRANT '+g.privilege+' ON FUNCTION '+g.signature+' TO '+role(g.role)+';');
out.push('GRANT USAGE ON SCHEMA public,extensions TO anon,authenticated,service_role;','GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;','NOTIFY pgrst,\'reload schema\';');
fs.writeFileSync(path.resolve('supabase/baseline.sql'),out.join('\n\n')+'\n');
console.log(JSON.stringify({tables:c.tables.length,functions:c.functions.length,views:c.views.length,policies:c.policies.length,applicationRows:0}));
