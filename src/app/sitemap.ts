import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const base='https://epo221.edu.mx';
  const routes=['','/conoce','/oferta','/noticias','/convocatorias','/albumes','/descargas','/contacto','/guia'];
  const entries:MetadataRoute.Sitemap=routes.map(path=>({url:base+'/publico'+path,changeFrequency:'weekly',priority:path?0.6:1}));
  entries.push({url:base+'/app-movil',changeFrequency:'monthly',priority:0.5});
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  for(const [table,published,path] of [['noticias','publicada','noticias'],['albumes','publicado','albumes'],['paginas_publicas','publicada','p']]){
    for(let offset=0;;offset+=500){
      const result=await client.from(table).select('id,slug,updated_at').eq(published,true).is('deleted_at',null).order('id').range(offset,offset+499);
      if(result.error)throw new Error('No se pudo generar el índice de publicaciones.');
      entries.push(...(result.data??[]).map(row=>({url:base+'/publico/'+path+'/'+encodeURIComponent(row.slug),lastModified:row.updated_at,changeFrequency:'monthly' as const,priority:0.5})));
      if(!result.data || result.data.length<500)break;
    }
  }
  const guide=await client.from('guias_escolares').select('updated_at').eq('publicada',true).order('updated_at',{ascending:false}).limit(1);
  if(guide.error)throw new Error('No se pudo generar el índice de guías.');
  const guideEntry=entries.find(e=>e.url.endsWith('/guia'));
  if(guideEntry && guide.data?.[0])guideEntry.lastModified=guide.data[0].updated_at;
  return entries;
}
