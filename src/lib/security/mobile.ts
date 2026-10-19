import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/supabase/admin';
import { resilientAuthFetch } from '@/lib/supabase/auth-resilience';

export function mobileReply(error:string,status:number) {
  return Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
}
export async function mobileIdentity(req:Request) {
  const token=/^Bearer ([^\s]+)$/.exec(req.headers.get('authorization')??'')?.[1];
  if(!token||token.length>10000)return {response:mobileReply('Sesión requerida.',401)};
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)return {response:mobileReply('Origen no permitido.',403)};
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    global:{headers:{Authorization:`Bearer ${token}`},fetch:resilientAuthFetch(process.env.NEXT_PUBLIC_SUPABASE_URL!)},auth:{persistSession:false,autoRefreshToken:false},
  });
  let identity;
  try { identity = await client.auth.getUser(token); }
  catch { return {response:mobileReply('No se pudo verificar tu acceso temporalmente. Reintenta.',503)}; }
  const {data:{user},error}=identity;
  if (error && (error.status === 402 || error.status === 429 || !error.status || error.status >= 500)) return {response:mobileReply('No se pudo verificar tu acceso temporalmente. Reintenta.',503)};
  if(error||!user)return {response:mobileReply('Sesión expirada.',401)};
  const {data:valid,error:sessionError}=await client.rpc('security_session_valid');
  if(sessionError||!valid)return {response:mobileReply('Completa la verificación de tu acceso.',403)};
  const service=adminClient();
  const {data:profile,error:profileError}=await service.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();
  if(profileError||!profile?.activo)return {response:mobileReply('Cuenta sin acceso.',403)};
  return {user,profile,client,service};
}
