import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PaginaPublica({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('paginas_publicas')
    .select('titulo, contenido, updated_at')
    .eq('slug', params.slug)
    .eq('publicada', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (!p) notFound();

  return (
    <article className="max-w-3xl mx-auto px-6 pt-32 pb-20">
      <h1 className="font-serif text-4xl text-verde">{p.titulo}</h1>
      {p.updated_at && (
        <p className="text-xs text-gray-400 mt-2">
          Actualizado {new Date(p.updated_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
      <div
        className="prose prose-verde mt-8 text-gray-800 leading-relaxed [&>h2]:font-serif [&>h2]:text-verde [&>h2]:text-2xl [&>h2]:mt-8 [&>h2]:mb-3 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>a]:text-verde [&>a]:underline"
        dangerouslySetInnerHTML={{ __html: p.contenido ?? '' }}
      />
    </article>
  );
}
