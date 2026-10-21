import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { documentReadingBySlug, readingGroups, sourceListLabel } from '@/lib/public-document-readings';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const reading = documentReadingBySlug((await params).slug);
  return { title: reading ? `${reading.title} · Lectura · EPO 221` : 'Documento no disponible · EPO 221', robots: { index: false, follow: true } };
}
export default async function DocumentReading({ params }: { params: Promise<{ slug: string }> }) {
  const reading = documentReadingBySlug((await params).slug);
  if (!reading) notFound();
  const client = await createClient();
  const result = await client.from('documentos_publicos').select('id,version')
    .eq('publicada', true).eq('pdf_url', reading.sourcePdf).eq('docx_url', reading.sourceDocx).eq('titulo', reading.title).limit(1);
  if (result.error) throw new Error('No se pudo comprobar la publicación del documento. Reintenta.');
  if (!result.data?.length) notFound();
  const headings = reading.blocks.map((block, index) => ({ ...block, index })).filter(block => block.kind === 'heading');
  return <div className="mx-auto max-w-4xl space-y-7 px-6 pb-20 pt-32 [overflow-wrap:anywhere]">
    <nav aria-label="Volver al catálogo"><Link href="/publico/descargas" className="inline-flex min-h-11 items-center underline text-verde">← Documentos institucionales</Link></nav>
    <header className="space-y-4"><h1 className="font-serif text-3xl text-verde md:text-4xl">{reading.title}: versión de lectura</h1>
      <p className="text-lg leading-8 text-gray-800">Texto del DOCX histórico en una página que permite ampliar la letra y recorrer sus encabezados con un lector de pantalla.</p>
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">Conserva el contenido del archivo histórico y sus referencias originales. No actualiza su vigencia ni establece requisitos nuevos. Confirma su uso con Control Escolar. Esta lectura no envía datos, no sustituye el formato para firma.</p>
      <p className="text-sm text-gray-700">Versión del catálogo: {result.data[0].version}</p>
    </header>
    <nav aria-label="Descargar originales y consultar vigencia" className="flex flex-wrap gap-4">
      <a href={reading.sourcePdf} download className="inline-flex min-h-11 items-center underline text-verde">PDF original</a>
      <a href={reading.sourceDocx} download className="inline-flex min-h-11 items-center underline text-verde">DOCX original</a>
      <Link href="/publico/contacto" className="inline-flex min-h-11 items-center underline text-verde">Consultar a Control Escolar</Link>
    </nav>
    <nav aria-label="Secciones del documento" className="rounded-xl border border-verde/20 p-5">
      <h2 className="mb-3 font-semibold text-verde">Ir a una sección</h2>
      <ul className="list-disc space-y-3 pl-6">{headings.map(block => <li key={block.index}><a href={`#bloque-${block.index}`} className="underline text-verde">{block.text}</a></li>)}</ul>
    </nav>
    <article aria-label={`Contenido histórico de ${reading.title}`} className="space-y-5 rounded-xl border border-verde/20 bg-white p-5 text-lg leading-8 text-gray-900 md:p-8">
      {readingGroups(reading.blocks).map(group => group.kind === 'heading'
        ? <h2 id={`bloque-${group.index}`} tabIndex={-1} key={group.index} className="scroll-mt-28 pt-4 font-serif text-2xl text-verde">{sourceListLabel(group.listStyle, group.listNumber)} {group.texts[0]}</h2>
        : group.kind === 'item'
          ? group.listStyle === 'bullet'
            ? <ul key={group.index} className="list-disc space-y-3 pl-6">{group.texts.map((text, index) => <li key={index}>{text}</li>)}</ul>
            : <ol key={group.index} start={group.listNumber} style={{listStyleType: group.listStyle === 'I' ? 'upper-roman' : group.listStyle === 'a' ? 'lower-alpha' : 'decimal'}} className="space-y-3 pl-8">{group.texts.map((text, index) => <li key={index}>{text}</li>)}</ol>
          : <p key={group.index}>{group.texts[0]}</p>)}
    </article>
  </div>;
}
