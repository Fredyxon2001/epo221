import { nativeLearningReady } from '@/lib/security/native-learning';
import { mobileIdentity,mobileReply } from '@/lib/security/mobile';
import { rateLimit } from '@/lib/security/rate-limit';
import { receiveUploadTicketForActor } from '@/lib/security/upload-tickets';
import { validateFormData } from '@/lib/security/form-data';
import { mobileUuid } from '@/lib/security/mobile-exams';
export const runtime='nodejs';
export async function POST(req:Request) {
  let uploadedPath: string | null = null;
  let mutationStarted = false;
  let cleanup: (() => Promise<void>) | null = null;
  try {
    const identity=await mobileIdentity(req);if(identity.response)return identity.response;
    const {user,profile,service}=identity;
    if(profile.rol!=='alumno')return mobileReply('Acceso de alumno requerido.',403);
    if(!req.headers.get('content-type')?.startsWith('application/json'))return mobileReply('Solicitud inválida.',400);
    if(Number(req.headers.get('content-length')??0)>115000)return mobileReply('Respuesta demasiado grande.',413);
    if(!await rateLimit('mobile-task-submit',30,600,user.id))return mobileReply('Demasiados intentos. Intenta más tarde.',429);
    const text=await req.text();if(Buffer.byteLength(text,'utf8')>115000)return mobileReply('Respuesta demasiado grande.',413);
    let input;try{input=JSON.parse(text);}catch{return mobileReply('Solicitud inválida.',400);}
    if(!mobileUuid(input?.task_id)||typeof input.comment!=='string'||!input.comment.trim()||input.comment.length>100000||
      (input.upload_ticket!==undefined&&(typeof input.upload_ticket!=='string'||input.upload_ticket.length>3000)))return mobileReply('Respuesta inválida.',400);
    if(input.upload_ticket!==undefined) {
      if(!await nativeLearningReady(service))return mobileReply('La carga móvil de archivos todavía no está habilitada. Usa el portal escolar.',503);
      // Authorize the task before touching a staged object. The transaction rechecks this scope.
      const task=await identity.client.from('tareas').select('id,permite_archivos').eq('id',input.task_id).maybeSingle();
      if(task.error)return mobileReply('No se pudo comprobar la tarea.',503);
      if(!task.data?.permite_archivos)return mobileReply('Esta tarea no admite el archivo.',409);
      let file: File;
      try {
        file=await receiveUploadTicketForActor(input.upload_ticket,user.id);
        if(file.size>25*1024*1024)return mobileReply('El archivo supera 25 MB.',400);
        const data=new FormData();data.set('archivo',file);await validateFormData(data);
      } catch { return mobileReply('La carga no es válida o venció. Selecciona el archivo nuevamente.',400); }
      const ext=file.name.split('.').pop()!.toLowerCase();
      uploadedPath=input.task_id+'/'+crypto.randomUUID()+'.'+ext;
      const path=uploadedPath;
      cleanup=async()=>{await service.storage.from('tareas').remove([path]);};
      const upload=await service.storage.from('tareas').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
      if(upload.error) {await cleanup();return mobileReply('No se pudo guardar el archivo. Selecciónalo nuevamente.',503);}
      mutationStarted=true;
      const saved=await service.rpc('security_mobile_submit_task_file',{p_actor_id:user.id,p_task_id:input.task_id,p_comment:input.comment,p_file:{path,name:file.name,type:file.type||'application/octet-stream',size:file.size}});
      if(saved.error) {
        // A transport failure can arrive after COMMIT. Never delete a possibly referenced file.
        const rolledBack=/^[0-9A-Z]{5}$/.test(saved.error.code??'')||/^PGRST[0-9]{3}$/.test(saved.error.code??'');
        if(!rolledBack) {
          const committed=await identity.client.from('entregas_tarea').select('id').eq('tarea_id',input.task_id).eq('archivo_url',path).maybeSingle();
          cleanup=null;uploadedPath=null;
          if(!committed.error&&committed.data)return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
          return mobileReply('No se pudo confirmar la entrega. Actualiza la tarea antes de volver a enviarla.',503);
        }
        await cleanup();
        if(saved.error.code==='PGRST202'||saved.error.code==='42883')return mobileReply('La carga móvil de archivos todavía no está habilitada. Usa el portal.',503);
        return mobileReply('No se pudo entregar. Comprueba la fecha, tu inscripción y si la tarea ya fue calificada.',409);
      }
      // From this point the file belongs to the committed delivery; never remove it on a cleanup error.
      cleanup=null;uploadedPath=null;
      const old=saved.data?.previous_path;
      if(typeof old==='string'&&old!==path&&old.startsWith(input.task_id+'/')) {
        try {await service.storage.from('tareas').remove([old]);} catch { /* Retain harmless old bytes instead of reporting a failed delivery. */ }
      }
      return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
    }
    const {error}=await service.rpc('security_mobile_submit_task',{p_actor_id:user.id,p_task_id:input.task_id,p_comment:input.comment});
    if(error)return mobileReply('No se pudo entregar. Comprueba la fecha, tu inscripción y si la tarea ya fue calificada.',409);
    return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
  }catch{
    if(uploadedPath&&cleanup&&!mutationStarted)try {await cleanup();}catch{}
    return mobileReply('No se pudo completar la entrega. Intenta nuevamente.',503);
  }
}
