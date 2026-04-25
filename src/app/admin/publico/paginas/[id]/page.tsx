import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { actualizarPagina } from '../actions';

export default async function EditarPagina({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('paginas_publicas')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!p) notFound();

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <Link href="/admin/publico/paginas" className="text-xs text-gray-500 hover:underline">← Páginas</Link>
        <h1 className="font-serif text-3xl text-verde mt-1">Editar: {p.titulo}</h1>
        <p className="text-xs text-gray-500 mt-1">
          URL pública: <code className="bg-gray-100 px-1 rounded">/publico/p/{p.slug}</code>
        </p>
      </div>

      <form action={actualizarPagina} className="bg-white rounded-lg shadow-sm p-5 space-y-4">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Título</label>
            <input name="titulo" defaultValue={p.titulo} required className="mt-1 w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Slug (URL)</label>
            <input name="slug" defaultValue={p.slug} required pattern="[a-z0-9][a-z0-9\-]*" className="mt-1 w-full border rounded px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Orden</label>
            <input name="orden" type="number" defaultValue={p.orden ?? 0} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publicada" defaultChecked={p.publicada} /> Publicada
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Contenido (HTML o texto)</label>
          <textarea
            name="contenido"
            defaultValue={p.contenido ?? ''}
            rows={20}
            className="mt-1 w-full border rounded px-3 py-2 text-sm font-mono"
            placeholder="<h2>Historia</h2><p>La escuela...</p>"
          />
          <p className="text-xs text-gray-400 mt-1">
            Puedes usar HTML simple: <code>&lt;h2&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;a&gt;</code>, etc.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t">
          <Link href={`/publico/p/${p.slug}`} target="_blank" className="text-sm px-4 py-2 rounded border hover:bg-gray-50">
            Vista previa
          </Link>
          <button type="submit" className="bg-verde text-white px-6 py-2 rounded hover:bg-verde-medio text-sm font-medium">
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
