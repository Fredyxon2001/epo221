import { requireIdentity } from "@/lib/security/access";
import { createClient } from '@/lib/supabase/server';
import { crearNoticia, togglePublicada, eliminarNoticia } from './actions';

export default async function AdminNoticias() {
  await requireIdentity(["admin","staff","director"]);

  const supabase = (await createClient());
  const { data: noticias } = await supabase
    .from('noticias').select('*').order('created_at', { ascending: false });

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Noticias</h1>

      <section className="bg-white rounded-lg p-5 shadow-xs">
        <h2 className="font-semibold text-verde mb-3">Nueva noticia</h2>
        <form action={crearNoticia} className="space-y-3 text-sm">
          <input name="titulo" placeholder="Título" required className="w-full border rounded-sm px-3 py-2" />
          <input name="resumen" placeholder="Resumen corto" className="w-full border rounded-sm px-3 py-2" />
          <textarea name="contenido" placeholder="Contenido (markdown)" rows={5} className="w-full border rounded-sm px-3 py-2" />
          <button className="bg-verde text-white px-4 py-2 rounded-sm hover:bg-verde-medio">Publicar borrador</button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-2">Título</th>
              <th className="text-left p-2">Publicada</th>
              <th className="text-left p-2">Creada</th>
              <th className="text-center p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(noticias ?? []).map((n) => (
              <tr key={n.id} className="border-t">
                <td className="p-2">{n.titulo}</td>
                <td className="p-2">{n.publicada ? '✓' : '—'}</td>
                <td className="p-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleDateString('es-MX')}</td>
                <td className="p-2 text-center space-x-2">
                  <form action={togglePublicada} className="inline">
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="publicada" value={n.publicada ? '0' : '1'} />
                    <button className="text-xs text-verde hover:underline">
                      {n.publicada ? 'Despublicar' : 'Publicar'}
                    </button>
                  </form>
                  <form action={eliminarNoticia} className="inline">
                    <input type="hidden" name="id" value={n.id} />
                    <button className="text-xs text-red-600 hover:underline">Eliminar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
