'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';
import { adminClient } from '@/lib/supabase/admin';
import { safePublicDocumentUrl } from '@/lib/public-guidance';

export async function guardarDocumento(formData: FormData) {
  const { client } = await requireAccess(['admin','staff','director'], 'publico:documento');
  await validateFormData(formData);
  const schema=z.object({id:z.string().uuid().optional(),titulo:z.string().trim().min(1).max(200),descripcion:z.string().trim().max(2000),audiencia:z.enum(['inscripcion','reinscripcion','general']),ciclo_id:z.string().uuid().nullable(),version:z.string().trim().min(1).max(100),pdf_url:z.string().max(2000),docx_url:z.string().max(2000)});
  const values=schema.parse({id:formData.get('id') || undefined,titulo:formData.get('titulo'),descripcion:formData.get('descripcion') ?? '',audiencia:formData.get('audiencia'),ciclo_id:formData.get('ciclo_id') || null,version:formData.get('version'),pdf_url:formData.get('pdf_url') ?? '',docx_url:formData.get('docx_url') ?? ''});
  if (!safePublicDocumentUrl(values.pdf_url,'pdf') || !safePublicDocumentUrl(values.docx_url,'docx')) throw new Error('Utiliza archivos PDF/DOCX del sitio o de su almacenamiento institucional.');
  const vigente=formData.get('vigente')==='on';
  if(vigente && !values.ciclo_id) throw new Error('Selecciona el ciclo aplicable a un documento vigente.');
  if(values.ciclo_id){const cycle=await client.from('ciclos_escolares').select('id').eq('id',values.ciclo_id).single();if(cycle.error)throw new Error('Ciclo inexistente.');}
  const documentId=values.id??randomUUID();
  const existing=values.id ? await client.from('documentos_publicos').select('id,pdf_url,docx_url,pdf_storage_path,docx_storage_path,publicado_en,version,ciclo_id').eq('id',values.id).single() : null;
  if(existing?.error)throw new Error('Documento inexistente o sin acceso.');
  const current=existing?.data;
  const paths={pdf_storage_path:current?.pdf_storage_path??null,docx_storage_path:current?.docx_storage_path??null};
  for(const format of ['pdf','docx'] as const){
    const key=format==='pdf'?'pdf_url':'docx_url',pathKey=format==='pdf'?'pdf_storage_path':'docx_storage_path';
    if(values[key].startsWith('/api/public/documentos/')){
      if(values[key]!==`/api/public/documentos/${documentId}/${format}` || !paths[pathKey])throw new Error('El enlace privado debe pertenecer a este documento y formato.');
    } else paths[pathKey]=null;
  }
  if(current?.publicado_en && (values.pdf_url!==current.pdf_url || values.docx_url!==current.docx_url || values.version!==current.version || values.ciclo_id!==current.ciclo_id || ['pdf','docx'].some(format=>{const file=formData.get(format+'_archivo');return file instanceof File && file.size>0;})))throw new Error('Crea un registro nuevo para reemplazar una versión que ya se publicó.');
  const uploaded:string[]=[];
  const storage=adminClient().storage.from('documentos-escolares');
  try {
    for(const format of ['pdf','docx'] as const){
      const file=formData.get(format+'_archivo');
      if(file instanceof File && file.size>0){
        if(file.name.split('.').pop()?.toLowerCase()!==format || file.size>20*1024*1024)throw new Error('Formato incorrecto o archivo mayor a 20 MB.');
        const path=`${documentId}/${randomUUID()}.${format}`;
        const type=format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const result=await storage.upload(path,file,{contentType:type,cacheControl:'3600',upsert:false});
        if(result.error)throw new Error('No se pudo almacenar el documento.');
        uploaded.push(path);values[format==='pdf'?'pdf_url':'docx_url']=`/api/public/documentos/${documentId}/${format}`;
        paths[format==='pdf'?'pdf_storage_path':'docx_storage_path']=path;
      }
    }
    if(!values.pdf_url && !values.docx_url)throw new Error('Adjunta al menos un PDF o DOCX.');
    const result=await client.from('documentos_publicos').upsert({...values,...paths,id:documentId,vigente,publicada:formData.get('publicada')==='on'}).select('id').single();
    if(result.error)throw new Error('No se guardó el documento.');
  } catch(error){if(uploaded.length)await storage.remove(uploaded);throw error;}
  if(current && !current.publicado_en){
    const replaced=([['pdf_storage_path',current.pdf_storage_path],['docx_storage_path',current.docx_storage_path]] as const).filter(([key,path])=>path && path!==paths[key]).map(([,path])=>path as string);
    if(replaced.length)await storage.remove(replaced);
  }
  revalidatePath('/admin/publico/descargas');revalidatePath('/publico/descargas');
}
