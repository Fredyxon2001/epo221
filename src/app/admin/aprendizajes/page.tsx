import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { crearAprendizaje, eliminarAprendizaje } from './actions';

export default async function AprendizajesPage({ searchParams }: { searchParams?: { materia?: string } }) {
  const supabase = createClient();

  const { data: materias } = await supabase.from('materias').select('id, nombre').order('nombre');
  const materiaFiltro = searchParams?.materia ?? '';

  let q = supabase
    .from('aprendizajes_esperados')
    .select('*, materia:materias(nombre), campo:campos_disciplinares(nombre)')
    .order('codigo', { ascending: true, nullsFirst: false });
  if (materiaFiltro) q = q.eq('materia_id', materiaFiltro);

  const { data: items } = await q;
  const { data: campos } = await supabase.from('campos_disciplinares').select('id, nombre').order('nombre');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Académico · Plan NEM"
        title="🎯 Aprendizajes esperados (NEM)"
        description="Catálogo de aprendizajes esperados del Marco Curricular Común. Se vinculan a tareas, planeaciones y evidencias del portafolio."
      />

      <Card>
        <details>
          <summary className="cursor-pointer font-semibold text-sm">➕ Nuevo aprendizaje</summary>
          <form action={crearAprendizaje} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
            <input name="codigo" placeholder="Código (ej. CD-M1.2)" className="border rounded px-2 py-1.5 md:col-span-1" />
            <select name="materia_id" required className="border rounded px-2 py-1.5 md:col-span-2">
              <option value="">— Materia —</option>
              {(materias ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <select name="campo_disciplinar_id" className="border rounded px-2 py-1.5 md:col-span-2">
              <option value="">— Campo disciplinar —</option>
              {(campos ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input name="semestre" type="number" min={1} max={6} placeholder="Sem" className="border rounded px-2 py-1.5" />
            <textarea name="descripcion" required rows={2} placeholder="Descripción del aprendizaje esperado…" className="md:col-span-5 border rounded px-2 py-1.5" />
            <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded">Agregar</button>
          </form>
        </details>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <a href="/admin/aprendizajes" className={`px-3 py-1 rounded-full font-semibold ${!materiaFiltro ? 'bg-verde text-white' : 'bg-gray-100'}`}>Todas las materias</a>
          {(materias ?? []).map((m: any) => (
            <a key={m.id} href={`/admin/aprendizajes?materia=${m.id}`} className={`px-3 py-1 rounded-full font-semibold ${materiaFiltro === m.id ? 'bg-verde text-white' : 'bg-gray-100'}`}>{m.nombre}</a>
          ))}
        </div>
        {!items?.length ? (
          <EmptyState icon="🎯" title="Sin aprendizajes" description="Agrega usando el formulario." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase border-b">
              <tr><th className="text-left p-2">Código</th><th className="text-left p-2">Materia</th><th className="text-left p-2">Descripción</th><th className="text-left p-2">Sem</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((a: any) => (
                <tr key={a.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{a.codigo ?? '—'}</td>
                  <td className="p-2 text-xs">{a.materia?.nombre ?? '—'}</td>
                  <td className="p-2 text-xs">{a.descripcion}</td>
                  <td className="p-2 text-xs">{a.semestre ?? '—'}</td>
                  <td className="p-2 text-right">
                    <form action={eliminarAprendizaje}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-rose-600 hover:underline">Eliminar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
