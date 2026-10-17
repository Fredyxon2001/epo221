import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicReadiness } from '@/lib/public-readiness';

export async function PublicationReadiness({ client }: { client: SupabaseClient }) {
  const [contact, cycles, guides, documents] = await Promise.all([
    client.from('sitio_config').select('telefono,email,horario').maybeSingle(),
    client.from('ciclos_escolares').select('id,activo').limit(1001),
    client.from('guias_escolares').select('ciclo_id,publicada,requisitos,fechas,preguntas').eq('publicada', true).limit(1001),
    client.from('documentos_publicos').select('ciclo_id,publicada,vigente,pdf_url,docx_url').eq('publicada', true).eq('vigente', true).limit(1001),
  ]);
  const unavailable = contact.error || cycles.error || guides.error || documents.error || [cycles, guides, documents].some(result => (result.data?.length ?? 0) >= 1000);
  return <section aria-labelledby="public-readiness" className="rounded-xl border border-slate-300 bg-white p-4 md:p-6 space-y-4">
    <h2 id="public-readiness" className="text-xl font-semibold text-slate-900">Antes de publicar información del ciclo</h2>
    <p className="text-sm text-slate-700">Esta comprobación señala contenido faltante. Un dato registrado o un enlace PDF no confirma exactitud, accesibilidad ni aprobación institucional. No modifica lo publicado.</p>
    {unavailable ? <p role="alert" className="text-amber-950">No se pudo comprobar toda la información. Revisa la conexión y vuelve a cargar antes de darla por completa.</p> : <ul className="grid gap-3 md:grid-cols-2">{publicReadiness({ contact: contact.data, cycles: cycles.data ?? [], guides: guides.data ?? [], documents: documents.data ?? [] }).map(check => <li key={check.id} className="rounded-lg border border-slate-200 p-4 space-y-2">
      <h3 className="font-semibold text-slate-900">{check.label} <span className={check.ready ? 'text-teal-800' : 'text-amber-950'}>· {check.ready ? 'Registrado, revisar' : 'Pendiente'}</span></h3>
      <p className="text-sm text-slate-700">{check.detail}</p>
      <Link href={check.href} className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline">Revisar {check.label.toLocaleLowerCase('es-MX')}</Link>
    </li>)}</ul>}
    <Link href="/admin/operacion" className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline">Registrar evidencia, responsables y aprobación con MFA</Link>
  </section>;
}
