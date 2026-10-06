const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
exports.load=function load(file,modules={},env={},cache=new Map()) {
  const absolute=path.resolve(__dirname,'..',file);
  if(cache.has(absolute))return cache.get(absolute);
  const result={}; cache.set(absolute,result);
  const requireModule=name=> {
    if(Object.hasOwn(modules,name))return modules[name];
    if(name==='server-only')return {};
    if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts',modules,env,cache);
    if(name.startsWith('.'))return load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(absolute),name+'.ts')),modules,env,cache);
    return require(name);
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports:result,require:requireModule,process:{env},Buffer,URL,Request,Response,Headers,FormData,Uint8Array,console,setTimeout,clearTimeout});
  return result;
};
