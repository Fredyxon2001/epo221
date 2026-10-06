if (!process.argv.includes('--live')) throw Error('Requiere --live para crear fixtures temporales.');
const assert = require('node:assert/strict');
const { createFixtures } = require('./flow-fixtures.cjs');
const { load } = require('./security-loader.cjs');
const f = createFixtures(); let actor;
function actions(file) { return load(file, {
  '@/lib/supabase/server':{createClient:async()=>actor.client}, '@/lib/supabase/admin':{adminClient:()=>f.admin},
  'next/headers':{headers:async()=>new Headers()}, 'next/cache':{revalidatePath:()=>{}},
  'next/navigation':{redirect:url=>{throw Error(`Redirect ${url}`);}},
},process.env); }
function form(values) { const data=new FormData();for(const [k,v] of Object.entries(values))data.set(k,String(v));return data; }
async function main(){try{
  const student=await f.account('alumno',97),other=await f.account('alumno',98),finance=await f.account('finanzas');
  await f.enroll(finance);
  const concept=await f.row('conceptos_pago',{clave:`FLOW-${Date.now()}`,nombre:'Financial fixture concept',tipo:'otro',monto:100,activo:false});
  const cargo=await f.row('cargos',{concepto_id:concept,alumno_id:student.studentId,monto:100});
  const foreignCargo=await f.row('cargos',{concepto_id:concept,alumno_id:other.studentId,monto:100});
  f.cleanups.push(async()=>{
    await f.admin.from('pagos').delete().in('cargo_id',[cargo,foreignCargo]);
    const files=await f.admin.storage.from('comprobantes').list(student.studentId);
    if(files.data?.length)await f.admin.storage.from('comprobantes').remove(files.data.map(file=>`${student.studentId}/${file.name}`));
  });
  actor=student;const submit=actions('src/app/alumno/estado-cuenta/actions.ts');
  const direct=await student.client.from('pagos').insert({cargo_id:cargo,alumno_id:student.studentId,monto_pagado:100,metodo:'efectivo',fecha_pago:'2026-10-05',validado_en:new Date().toISOString()});
  assert.equal(direct.error?.code,'42501','Direct payment forgery allowed');
  const receipt=()=>{const data=form({cargo_id:cargo,metodo:'transferencia',referencia:'Synthetic receipt'});data.set('comprobante',new File(['%PDF-1.4\nSynthetic receipt'],'fixture.pdf',{type:'application/pdf'}));return data;};
  await assert.rejects(()=>submit.subirComprobante(form({cargo_id:cargo,metodo:'transferencia'})));
  await submit.subirComprobante(receipt());
  const payment=await f.admin.from('pagos').select('id').eq('cargo_id',cargo).single();assert.ok(payment.data);
  let charge=await f.admin.from('cargos').select('estatus').eq('id',cargo).single();assert.equal(charge.data.estatus,'en_revision');
  actor=other;await assert.rejects(()=>submit.subirComprobante(receipt()));
  actor=finance;const review=actions('src/app/admin/pagos/actions.ts');
  await assert.rejects(()=>review.validarPago(form({pago_id:payment.data.id,cargo_id:foreignCargo})));
  await review.rechazarPago(form({pago_id:payment.data.id,cargo_id:cargo,motivo:'Synthetic rejection'}));
  charge=await f.admin.from('cargos').select('estatus').eq('id',cargo).single();assert.equal(charge.data.estatus,'pendiente');
  actor=student;await submit.subirComprobante(receipt());
  const retry=await f.admin.from('pagos').select('id').eq('cargo_id',cargo).is('rechazado_motivo',null).single();assert.ok(retry.data);
  actor=finance;await review.validarPago(form({pago_id:retry.data.id,cargo_id:cargo}));
  charge=await f.admin.from('cargos').select('estatus').eq('id',cargo).single();assert.equal(charge.data.estatus,'pagado');
  const validated=await f.admin.from('pagos').select('validado_en,folio_recibo').eq('id',retry.data.id).single();assert.ok(validated.data.validado_en&&validated.data.folio_recibo);
  console.log('PASS receipt upload → financial review/rejection → corrected receipt → validation/folio/cargo paid; missing file, foreign cargo, mismatched payment and direct validation forgery denied.');
}finally{await f.cleanup();}}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
