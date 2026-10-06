import { mobileIdentity,mobileReply } from '@/lib/security/mobile';
import { rateLimit } from '@/lib/security/rate-limit';
export const runtime='nodejs';
export async function POST(req:Request) {
  try {
    const identity=await mobileIdentity(req);if(identity.response)return identity.response;
    const {user,profile,service}=identity;
    if(profile.rol!=='alumno')return mobileReply('Acceso de alumno requerido.',403);
    if(!req.headers.get('content-type')?.startsWith('application/json'))return mobileReply('Solicitud inválida.',400);
    if(Number(req.headers.get('content-length')??0)>110000)return mobileReply('Respuesta demasiado grande.',413);
    if(!await rateLimit('mobile-task-submit',30,600,user.id))return mobileReply('Demasiados intentos. Intenta más tarde.',429);
    const text=await req.text();if(text.length>110000)return mobileReply('Respuesta demasiado grande.',413);
    let input;try{input=JSON.parse(text);}catch{return mobileReply('Solicitud inválida.',400);}
    if(typeof input?.task_id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(input.task_id)
      ||typeof input.comment!=='string'||!input.comment.trim()||input.comment.length>100000)return mobileReply('Respuesta inválida.',400);
    const {error}=await service.rpc('security_mobile_submit_task',{p_actor_id:user.id,p_task_id:input.task_id,p_comment:input.comment});
    if(error)return mobileReply('No se pudo entregar. Comprueba la fecha, tu inscripción y si la tarea ya fue calificada.',409);
    return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
  }catch{return mobileReply('No se pudo completar la entrega. Intenta nuevamente.',503);}
}
