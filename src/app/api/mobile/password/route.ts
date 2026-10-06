import { createClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/supabase/admin';
import { passwordError } from '@/lib/security/password';
import { rateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export async function POST(req: Request) {
  const reply=(error: string,status: number)=>Response.json({error},{status,headers:{'Cache-Control':'private, no-store'}});
  // Native requests use a bearer token, never a web cookie or a supplied user ID.
  const token=/^Bearer ([^\s]+)$/.exec(req.headers.get('authorization')??'')?.[1];
  if(!token||token.length>10000)return reply('Sesión requerida.',401);
  const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return reply('Origen no permitido.',403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return reply('Solicitud inválida.',400);
  if(Number(req.headers.get('content-length')??0)>3000)return reply('Solicitud demasiado grande.',413);
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await client.auth.getUser(token);if(userError||!user)return reply('Sesión expirada.',401);
  const {data:alive,error:aliveError}=await client.rpc('security_session_alive');if(aliveError||!alive)return reply('Sesión expirada.',401);
  const service=adminClient();
  const {data:profile,error:profileError}=await service.from('perfiles').select('activo,rol,debe_cambiar_password').eq('id',user.id).maybeSingle();
  if(profileError||!profile?.activo||!['alumno','profesor','admin','staff','director','finanzas'].includes(profile.rol))return reply('Cuenta sin acceso.',403);
  const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if(assuranceError||!assurance)return reply('No se pudo comprobar la seguridad.',403);
  if((assurance.nextLevel==='aal2'||(!profile.debe_cambiar_password&&['admin','staff','director','finanzas'].includes(profile.rol)))&&assurance.currentLevel!=='aal2')return reply('Verifica el autenticador antes de cambiar la contraseña.',403);
  try {
    if(!await rateLimit('mobile-password-change',5,900,user.id))return reply('Demasiados intentos. Intenta más tarde.',429);
    const text=await req.text();if(text.length>3000)return reply('Solicitud demasiado grande.',413);
    let input;try{input=JSON.parse(text);}catch{return reply('Solicitud inválida.',400);}
    if(typeof input?.password!=='string'||typeof input?.confirmation!=='string')return reply('Solicitud inválida.',400);
    const invalid=passwordError(input.password);if(invalid)return reply(invalid,400);
    if(input.password!==input.confirmation)return reply('Las contraseñas no coinciden.',400);
    const {error:changeError}=await service.auth.admin.updateUserById(user.id,{password:input.password});
    if(changeError)return reply('No se pudo cambiar la contraseña. Intenta nuevamente.',400);
    const {error:flagError}=await service.from('perfiles').update({debe_cambiar_password:false,password_reset_at:new Date().toISOString()}).eq('id',user.id);
    const {error:revokeError}=await service.rpc('security_revoke_user_sessions',{p_user_id:user.id});
    if(flagError||revokeError)return reply('Contraseña actualizada. Contacta a Control Escolar para comprobar el estado de tu acceso.',503);
    return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
  } catch {return reply('No se pudo completar el cambio. Intenta nuevamente.',503);}
}
