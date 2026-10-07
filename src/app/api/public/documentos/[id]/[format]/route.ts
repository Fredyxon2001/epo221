import { NextResponse } from 'next/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { adminClient } from '@/lib/supabase/admin';
import { apiAccess } from '@/lib/security/api-access';
import { sessionIdentity } from '@/lib/security/access';
import { ADMIN_ROLES, hasRole } from '@/lib/security/policy';
import { safePublicDocumentUrl } from '@/lib/public-guidance';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'};
const absent=()=>NextResponse.json({error:'Documento no disponible.'},{status:404,headers});
export async function GET(request:Request,{params}:{params:Promise<{id:string;format:string}>}){
  const {id,format}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !['pdf','docx'].includes(format))return absent();
  const anon=createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const columns='id,pdf_url,docx_url,pdf_storage_path,docx_storage_path';
  const published=await anon.from('documentos_publicos').select(columns).eq('id',id).eq('publicada',true).maybeSingle();
  if(published.error)return NextResponse.json({error:'No se pudo consultar el documento.'},{status:503,headers});
  let row=published.data;
  if(!row){
    const identity=await sessionIdentity();
    if(!identity || !hasRole(identity.profile.rol,ADMIN_ROLES))return absent();
    const denied=await apiAccess(request,ADMIN_ROLES);
    if(denied){denied.headers.set('Cache-Control',headers['Cache-Control']);return denied;}
    const preview=await identity.client.from('documentos_publicos').select(columns).eq('id',id).maybeSingle();
    if(preview.error)return NextResponse.json({error:'No se pudo consultar el documento.'},{status:503,headers});
    row=preview.data;
  }
  if(!row)return absent();
  const kind=format as 'pdf'|'docx';
  const path=kind==='pdf'?row.pdf_storage_path:row.docx_storage_path;
  const url=kind==='pdf'?row.pdf_url:row.docx_url;
  if(path){
    if(!new RegExp(`^${id}/[0-9a-f-]{36}\\.${kind}$`,'i').test(path))return absent();
    const signed=await adminClient().storage.from('documentos-escolares').createSignedUrl(path,60,{download:true});
    if(signed.error || !signed.data?.signedUrl)return absent();
    return NextResponse.redirect(signed.data.signedUrl,{status:307,headers});
  }
  // Immutable historical files are already public. Avoid loops into this endpoint.
  if(!url || url.startsWith('/api/') || !safePublicDocumentUrl(url,kind))return absent();
  return NextResponse.redirect(new URL(url,request.url),{status:307,headers});
}
