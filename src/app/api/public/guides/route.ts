import { createClient } from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const cycle=new URL(request.url).searchParams.get('ciclo');
  if(cycle && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cycle))return Response.json({error:'Ciclo inválido.'},{status:400});
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  let query=client.from('guias_escolares').select('id,ciclo_id,ciclo_label,titulo,requisitos,fechas,preguntas,updated_at').eq('publicada',true).order('ciclo_label',{ascending:false});
  if(cycle)query=query.eq('ciclo_id',cycle);
  const result=await query;
  if(result.error)return Response.json({error:'No se pudo consultar la guía.'},{status:503});
  return Response.json({guides:result.data},{headers:{'Cache-Control':'public, max-age=60'}});
}
