import { mobileIdentity, mobileReply } from '@/lib/security/mobile';
import { pendingInbox } from '@/lib/pendientes';
export const dynamic='force-dynamic';
export async function GET(req:Request) {
  const identity=await mobileIdentity(req);
  if(identity.response)return identity.response;
  try {
    const inbox=await pendingInbox(identity.client,identity.user.id,identity.profile.rol);
    return Response.json(inbox,{headers:{'Cache-Control':'private, no-store'}});
  } catch {return mobileReply('No se pudo cargar la bandeja. Reintenta.',503);}
}
