const assert=require('node:assert/strict');
const {load}=require('./security-loader.cjs');
function mock(tables,fail) {
  return {from(table){
    assert.notEqual(table,'pagos','Finances must not contribute to academic risk');
    let predicates=[],slice=[0,1000];
    const value=(row,path)=>path.split('.').reduce((v,p)=>v?.[p],row);
    const query={select(){return this;},order(){return this;},
      eq(key,v){predicates.push(r=>value(r,key)===v);return this;},
      in(key,ids){predicates.push(r=>ids.includes(value(r,key)));return this;},
      gte(key,v){predicates.push(r=>value(r,key)!=null && value(r,key)>=v);return this;},
      lte(key,v){predicates.push(r=>value(r,key)!=null && value(r,key)<=v);return this;},
      lt(key,v){predicates.push(r=>value(r,key)!=null && value(r,key)<v);return this;},
      range(start,end){slice=[start,end+1];return this;},
      then(resolve){const rows=(tables[table]??[]).filter(r=>predicates.every(p=>p(r)));return Promise.resolve(table===fail?{data:null,error:{code:'TEST'}}:{data:rows.slice(...slice),error:null}).then(resolve);}
    };return query;
  }};
}
const score=load('src/lib/riesgo/score.ts');
const now=Date.now(),past=new Date(now-86400000).toISOString(),future=new Date(now+86400000).toISOString();
const task=(id,group,end=past,start=past)=>({id,fecha_entrega:end,fecha_apertura:start,asignacion:{ciclo_id:'cycle',grupo_id:group}});
async function main(){
  const tables={
    inscripciones:[{alumno_id:'A',grupo_id:'GA',ciclo_id:'cycle',estatus:'activa'},{alumno_id:'B',grupo_id:'GB',ciclo_id:'cycle',estatus:'activa'}],
    tareas:[task('a1','GA'),task('a2','GA'),...Array.from({length:7},(_,i)=>task('b'+i,'GB')),task('future','GA',future),task('no-date','GA',null),task('unopened','GA',past,future)],
    calificaciones:[{alumno_id:'A',asignacion:{ciclo_id:'cycle',grupo_id:'GB'},promedio_final:0,p1:0}],
    entregas_tarea:[],reportes_conducta:[{alumno_id:'A',tipo:'negativo',fecha:future.slice(0,10)},{alumno_id:'A',tipo:'negativo',fecha:future.slice(0,10)}]
  };
  let result=await score.calcularRiesgoCiclo(mock(tables),'cycle');
  assert.equal(result.find(r=>r.alumno_id==='A').score,0,'Foreign tasks/grades or future tasks changed risk');
  assert.equal(result.find(r=>r.alumno_id==='B').score,15);
  tables.tareas.push(task('a3','GA'));
  result=await score.calcularRiesgoCiclo(mock(tables),'cycle');
  assert.equal(result.find(r=>r.alumno_id==='A').score,15);
  tables.entregas_tarea=[{tarea_id:'a1',alumno_id:'A'},{tarea_id:'a2',alumno_id:'A'}];
  result=await score.calcularRiesgoCiclo(mock(tables),'cycle');
  assert.equal(result.find(r=>r.alumno_id==='A').score,0);
  for(const table of ['inscripciones','calificaciones','reportes_conducta','tareas','entregas_tarea'])
    await assert.rejects(()=>score.calcularRiesgoCiclo(mock(tables,table),'cycle'),/No se pudo consultar/);
  const many={inscripciones:Array.from({length:1101},(_,i)=>({alumno_id:String(i),grupo_id:'GA',ciclo_id:'cycle',estatus:'activa'})),tareas:[],calificaciones:[],entregas_tarea:[]};
  assert.equal((await score.calcularRiesgoCiclo(mock(many),'cycle')).length,1101,'PostgREST row limit truncated pupils');
  for(const [n,expected]of [[0,'bajo'],[25,'medio'],[50,'alto'],[75,'critico'],[100,'critico']])assert.equal(score.nivelDeScore(n),expected);
  console.log('PASS risk regressions: own groups only; due/open tasks; deliveries; null dates; foreign grades; all query errors; >1000 pupils; financial separation.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
