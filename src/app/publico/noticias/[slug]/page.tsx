import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ArticuloMarkdown } from '@/components/publico/ArticuloMarkdown';

export default async function NoticiaDetalle({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: n } = await supabase
    .from('noticias').select('*').eq('slug', params.slug).eq('publicada', true).single();
  if (!n) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 pt-32 pb-20">
      <div className="text-xs text-gray-500">
        {n.fecha_pub && new Date(n.fecha_pub).toLocaleDateString('es-MX')}
      </div>
      <h1 className="font-serif text-4xl text-verde mt-2">{n.titulo}</h1>
      {n.resumen && <p className="text-lg text-gray-700 mt-3 italic">{n.resumen}</p>}
      {/* El contenido se guarda en markdown; sin este render se veían los
          caracteres `##` y `**` en crudo. */}
      <div className="mt-6">
        <ArticuloMarkdown md={n.contenido ?? ''} />
      </div>
    </article>
  );
}
