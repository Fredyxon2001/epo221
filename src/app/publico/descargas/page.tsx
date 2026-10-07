import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { safePublicDocumentUrl } from '@/lib/public-guidance';

export const metadata = { title: 'Descargas · EPO 221', description: 'Documentos publicados por la escuela, identificados por ciclo y versión.' };
export default async function Descargas({ searchParams }: { searchParams: Promise<{ ciclo?: string }> }) {
  const query = await searchParams;
  const client = await createClient();
  const result = await client.from('documentos_publicos').select('id,titulo,descripcion,audiencia,version,vigente,ciclo_id,pdf_url,docx_url,updated_at,ciclos_escolares(codigo)').eq('publicada', true).order('vigente', { ascending: false }).order('updated_at', { ascending: false });
  if (result.error) throw new Error('No se pudo cargar el catálogo de documentos. Reintenta.');
  const documents = result.data ?? [];
  const cycles = new Map<string,string>();
  for (const doc of documents) if (doc.ciclo_id) {
    const cycle = Array.isArray(doc.ciclos_escolares) ? doc.ciclos_escolares[0] : doc.ciclos_escolares;
    cycles.set(doc.ciclo_id, cycle?.codigo ?? 'Ciclo escolar');
  }
  const filtered = documents.filter(doc => !query.ciclo || (query.ciclo === 'historico' ? !doc.ciclo_id : doc.ciclo_id === query.ciclo));
  return <div className="max-w-5xl mx-auto px-6 pt-32 pb-20 space-y-8">
    <header><h1 className="font-serif text-4xl text-verde">Descargas institucionales</h1><p className="mt-4 text-gray-700">Comprueba el ciclo, la versión y la vigencia antes de utilizar un documento. Los requisitos y las fechas de un trámite se consultan en la guía y las convocatorias publicadas.</p></header>
    <div className="border border-amber-300 bg-amber-50 rounded-xl p-5 text-amber-950">Los archivos históricos conservan su contenido original y pueden incluir fechas anteriores. Confirma su uso con Control Escolar. Esta página no establece montos ni condiciona la inscripción a una aportación.</div>
    <nav aria-label="Información del trámite" className="flex flex-wrap gap-4"><Link href="/publico/guia" className="underline text-verde">Guía escolar</Link><Link href="/publico/convocatorias" className="underline text-verde">Convocatorias</Link><Link href="/publico/contacto" className="underline text-verde">Contactar a Control Escolar</Link></nav>
    <form className="flex flex-wrap gap-3 items-end"><label>Ciclo del documento<select name="ciclo" defaultValue={query.ciclo ?? ''} className="block border rounded p-3"><option value="">Todos</option>{Array.from(cycles).map(([id,label])=><option key={id} value={id}>{label}</option>)}<option value="historico">Archivos sin ciclo asignado</option></select></label><button className="bg-verde text-white rounded p-3">Consultar documentos</button></form>
    {!filtered.length && <p>No hay documentos publicados para esta selección. Consulta con Control Escolar.</p>}
    <div className="grid md:grid-cols-2 gap-5">{filtered.map(doc=><article key={doc.id} className="rounded-2xl border border-verde/20 bg-white p-6 space-y-4">
      <h2 className="font-serif text-2xl text-verde">{doc.titulo}</h2>
      <p className="text-sm text-gray-700">{doc.descripcion}</p>
      <p className="text-sm">{doc.vigente ? 'Vigente según publicación de la escuela' : 'Histórico · confirmar su uso'} · {doc.ciclo_id ? cycles.get(doc.ciclo_id) : 'Sin ciclo asignado'}<br/>Versión: {doc.version}</p>
      <p className="text-xs text-gray-600">Actualizado {new Date(doc.updated_at).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'})}</p>
      <div className="flex flex-wrap gap-3">{(['pdf','docx'] as const).map(format=>{
        const url=doc[format==='pdf'?'pdf_url':'docx_url'];
        return url && safePublicDocumentUrl(url,format) ? <a key={format} href={url} download className="rounded-lg border border-verde px-4 py-3 font-semibold text-verde hover:bg-verde hover:text-white" aria-label={`Descargar ${doc.titulo} en ${format.toUpperCase()}`}>{format==='pdf'?'PDF para leer e imprimir':'DOCX editable'} ↓</a> : null;
      })}</div>
    </article>)}</div>
  </div>;
}
