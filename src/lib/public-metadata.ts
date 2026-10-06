import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
export const publicArticle=cache(async(table:'noticias'|'albumes'|'paginas_publicas',slug:string)=>{
  const client=await createClient();
  const result=await client.from(table).select('*').eq('slug',slug).eq(table==='albumes'?'publicado':'publicada',true).is('deleted_at',null).maybeSingle();
  if(result.error)throw new Error('No se pudo consultar la publicación.');
  return result.data;
});
export function articleMetadata(row:Record<string,unknown>|null,path:string):Metadata{
  if(!row)return {title:'Publicación no disponible',robots:{index:false,follow:false}};
  const title=String(row.titulo);
  const description=String(row.resumen??row.descripcion??'Publicación de la Escuela Preparatoria Oficial 221.').slice(0,180);
  const url='https://epo221.edu.mx'+path;
  return {title:title+' · EPO 221',description,alternates:{canonical:url},openGraph:{title,description,url,type:'article',modifiedTime:String(row.updated_at)}};
}
