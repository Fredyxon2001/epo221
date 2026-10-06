import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
export type PendingItem = { id:string; titulo:string; detalle:string; href:string; mobilePath?:string; fecha?:string; categoria:string };
export type PendingInbox = { items:PendingItem[]; avisos:string[]; limitado:boolean };

export async function pendingInbox(client:SupabaseClient, userId:string, role:string):Promise<PendingInbox> {
  const items:PendingItem[] = [], avisos:string[] = [];
  let limitado=false;
  const check = <T,>(result:{data:T|null;error:unknown}):T => {
    if(result.error) throw new Error('No se pudo cargar la bandeja. Reintenta.');
    return result.data as T;
  };
  const addCount = async (table:string,estadoColumn:string,estado:string,title:string,href:string) => {
    const result = await client.from(table).select('id',{count:'exact',head:true}).eq(estadoColumn,estado);
    check(result);
    if(result.count) items.push({id:table,titulo:title,detalle:result.count+' pendiente(s)',href,categoria:'Revisión'});
  };
  if(role==='alumno') {
    const alumno = check<{id:string}|null>(await client.from('alumnos').select('id').eq('perfil_id',userId).maybeSingle());
    if(!alumno) return {items,avisos:['Tu cuenta no tiene expediente vinculado.'],limitado};
    const insc = check(await client.from('inscripciones').select('grupo_id,ciclo_id,ciclo:ciclos_escolares!inner(cerrado_en)').eq('alumno_id',alumno.id).eq('estatus','activa').is('ciclo.cerrado_en',null).order('fecha_inscripcion',{ascending:false}).order('id').limit(1));
    if(!insc.length) return {items,avisos:['Sin inscripción en un ciclo abierto. Consulta Control Escolar.'],limitado};
    const groups=insc.map(i=>i.grupo_id), cycles=insc.map(i=>i.ciclo_id);
    const assignments=check(await client.from('asignaciones').select('id').in('grupo_id',groups).in('ciclo_id',cycles));
    const ids=assignments.map(a=>a.id);
    if(ids.length) {
      const tasksResult=await 
        client.from('tareas').select('id,titulo,fecha_entrega,cierra_estricto').in('asignacion_id',ids).lte('fecha_apertura',new Date().toISOString()).order('fecha_entrega',{nullsFirst:false}).limit(201);
      const tasks=check(tasksResult);
      // Fetch only the displayed tasks; avoids truncating a student's historical deliveries.
      const deliveries:{tarea_id:string}[]=[];
      for(let offset=0;offset<tasks.length;offset+=100) deliveries.push(...check(await client.from('entregas_tarea').select('tarea_id').eq('alumno_id',alumno.id).in('tarea_id',tasks.slice(offset,offset+100).map(t=>t.id))));
      const submitted=new Set(deliveries.map(d=>d.tarea_id));
      limitado=tasks.length>200;
      for(const task of tasks.slice(0,200)) if(!submitted.has(task.id) && !(task.cierra_estricto && task.fecha_entrega && Date.parse(task.fecha_entrega)<Date.now()))
        items.push({id:task.id,titulo:task.titulo,detalle:task.fecha_entrega && Date.parse(task.fecha_entrega)<Date.now()?'Vencida · consulta si aún se acepta':'Sin entrega registrada',href:'/alumno/tareas/'+task.id,mobilePath:'/tarea/'+task.id,fecha:task.fecha_entrega??undefined,categoria:'Tarea'});
    }
    const revisions = check(await client.from('solicitudes_revision').select('id,estado').eq('alumno_id',alumno.id).in('estado',['abierta','respondida']).limit(201));
    limitado ||= revisions.length>200;
    revisions.slice(0,200).forEach(r=>items.push({id:r.id,titulo:'Revisión de calificación',detalle:r.estado==='respondida'?'Respuesta disponible':'En revisión docente',href:'/alumno/solicitudes',categoria:'Solicitud'}));
    const [chargesResult,paymentsResult]=await Promise.all([
      client.from('cargos').select('id,monto').eq('alumno_id',alumno.id).neq('estatus','cancelado').neq('estatus','pagado').limit(201),
      client.from('pagos').select('cargo_id,monto_pagado').eq('alumno_id',alumno.id).not('validado_en','is',null).is('rechazado_motivo',null).limit(1001),
    ]);
    const charges=check(chargesResult),payments=check(paymentsResult);
    limitado ||= charges.length>200 || payments.length>1000;
    const pending=charges.filter(c=>Number(c.monto)>payments.filter(p=>p.cargo_id===c.id).reduce((s,p)=>s+Number(p.monto_pagado),0));
    if(pending.length) items.push({id:'saldo',titulo:'Revisar estado de cuenta',detalle:'Seguimiento financiero separado del riesgo académico',href:'/alumno/estado-cuenta',mobilePath:'/estado-cuenta',categoria:'Finanzas'});
  } else if(role==='profesor') {
    const teacher=check<{id:string}|null>(await client.from('profesores').select('id').eq('perfil_id',userId).maybeSingle());
    if(teacher) {
      const assignments=check(await client.from('asignaciones').select('id,ciclo:ciclos_escolares!inner(activo)').eq('profesor_id',teacher.id).eq('ciclo.activo',true));
      if(assignments.length) {
        const tasks=check(await client.from('tareas').select('id').in('asignacion_id',assignments.map(a=>a.id)).limit(501));
        limitado ||= tasks.length>500;
        if(tasks.length) {
          let count=0;
          for(let offset=0;offset<Math.min(tasks.length,500);offset+=100){const result=await client.from('entregas_tarea').select('id',{head:true,count:'exact'}).in('tarea_id',tasks.slice(offset,Math.min(offset+100,500)).map(t=>t.id)).is('calificacion',null);check(result);count+=result.count??0;}
          if(count) items.push({id:'calificar',titulo:'Entregas por calificar',detalle:count+' entrega(s)',href:'/profesor/tareas',categoria:'Evaluación'});
        }
        const reviews=await client.from('solicitudes_revision').select('id',{head:true,count:'exact'}).in('asignacion_id',assignments.map(a=>a.id)).eq('estado','abierta');
        check(reviews);
        if(reviews.count)items.push({id:'revision',titulo:'Revisiones por responder',detalle:reviews.count+' solicitud(es)',href:'/profesor/solicitudes',categoria:'Solicitud'});
      }
    }
  } else {
    if(['admin','staff','director'].includes(role)) {
      await Promise.all([
        addCount('solicitudes_parcial','estado','pendiente','Aperturas de parcial','/admin/parciales/solicitudes'),
        addCount('solicitudes_modificacion_ficha','estado','pendiente','Cambios de ficha','/admin/alumnos/solicitudes-ficha'),
      ]);
    }
    if(['admin','staff','director','finanzas'].includes(role)) {
      const result=await client.from('pagos').select('id',{head:true,count:'exact'}).is('validado_en',null).is('rechazado_motivo',null);
      check(result);
      if(result.count)items.push({id:'pagos',titulo:'Comprobantes por validar',detalle:result.count+' pago(s)',href:'/admin/pagos',categoria:'Finanzas'});
    }
  }
  const notices=await client.from('notificaciones').select('id',{head:true,count:'exact'}).eq('user_id',userId).eq('leida',false);
  check(notices);
  if(notices.count)avisos.push(notices.count+' notificación(es) sin leer. Revisa la campana del portal.');
  items.sort((a,b)=>(a.fecha??'9999').localeCompare(b.fecha??'9999') || a.titulo.localeCompare(b.titulo));
  return {items,avisos,limitado};
}
