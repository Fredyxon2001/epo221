import { z } from 'zod';
import { mobileIdentity, mobileReply } from '@/lib/security/mobile';
import { rateLimit } from '@/lib/security/rate-limit';
export const dynamic='force-dynamic';
export async function GET(req:Request) {
  const identity=await mobileIdentity(req);if(identity.response)return identity.response;
  if(!['admin','staff','director'].includes(identity.profile.rol))return mobileReply('Sin permiso.',403);
  const id=new URL(req.url).searchParams.get('id');
  if(id && !z.string().uuid().safeParse(id).success)return mobileReply('Ciclo inválido.',400);
  if(!id) {
    const result=await identity.client.from('ciclos_escolares').select('id,codigo,activo,cerrado_en,fecha_inicio,fecha_fin').order('codigo',{ascending:false});
    if(result.error)return mobileReply('No se pudieron consultar los ciclos.',503);
    return Response.json({cycles:result.data},{headers:{'Cache-Control':'private, no-store'}});
  }
  const [diagnostic,history]=await Promise.all([
    identity.client.rpc('security_cycle_diagnostic',{p_cycle:id}),
    identity.client.from('ciclo_historial').select('accion,motivo,created_at').eq('ciclo_id',id).order('created_at',{ascending:false}).limit(30),
  ]);
  if(diagnostic.error || history.error)return mobileReply('No se pudo consultar el diagnóstico.',503);
  return Response.json({diagnostic:diagnostic.data,history:history.data},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(req:Request) {
  const identity=await mobileIdentity(req);if(identity.response)return identity.response;
  if(!['admin','staff','director'].includes(identity.profile.rol))return mobileReply('Sin permiso.',403);
  if(!await rateLimit('mobile-cycle',30,60,identity.user.id))return mobileReply('Intenta más tarde.',429);
  if(Number(req.headers.get('content-length')??0)>8000)return mobileReply('Solicitud demasiado grande.',413);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return mobileReply('Solicitud inválida.',400);
  const text=await req.text();if(text.length>8000)return mobileReply('Solicitud demasiado grande.',413);
  let body;try {body=z.object({id:z.string().uuid(),action:z.enum(['activar','cerrar','reabrir']),reason:z.string().trim().min(10).max(1000),confirmed:z.literal(true)}).strict().parse(JSON.parse(text));}
  catch {return mobileReply('Revisa el motivo y la confirmación.',400);}
  const result=await identity.client.rpc('security_cycle_transition',{p_cycle:body.id,p_action:body.action,p_reason:body.reason});
  if(result.error)return mobileReply('Operación rechazada. Actualiza el diagnóstico y resuelve las incidencias.',409);
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
}
