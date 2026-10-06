import { createClient } from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET() {
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await client.from('guias_escolares').select('id,ciclo_id,ciclo_label,titulo,requisitos,fechas,preguntas,updated_at').eq('publicada',true).order('ciclo_label',{ascending:false});
  if(result.error)return Response.json({error:'No se pudo consultar la guía.'},{status:503});
  return Response.json({guides:result.data},{headers:{'Cache-Control':'public, max-age=60'}});
}
