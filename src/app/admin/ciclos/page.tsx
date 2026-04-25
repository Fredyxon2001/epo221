import { createClient } from '@/lib/supabase/server';
import { crearCiclo, activarCiclo } from './actions';

export default async function AdminCiclos() {
  const supabase = createClient();
  const { data: ciclos } = await supabase
    .from('ciclos_escolares').select('*').order('codigo', { ascending: false });

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Ciclos escolares</h1>

      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-3">Nuevo ciclo</h2>
        <form action={crearCiclo} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <input name="codigo" placeholder="Código (2026-2027)" required className="border rounded px-2 py-1" />
          <input name="periodo" placeholder="Periodo (2026A / 2026B)" required className="border rounded px-2 py-1" />
          <input name="fecha_inicio" type="date" className="border rounded px-2 py-1" />
          <input name="fecha_fin" type="date" className="border rounded px-2 py-1" />
          <button className="bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio">Crear</button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-2">Código</th>
              <th className="text-left p-2">Periodo</th>
              <th className="text-left p-2">Vigencia</th>
              <th className="text-center p-2">Activo</th>
              <th className="text-center p-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {(ciclos ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.codigo}</td>
                <td className="p-2">{c.periodo}</td>
                <td className="p-2 text-xs text-gray-500">
                  {c.fecha_inicio ?? '—'} → {c.fecha_fin ?? '—'}
                </td>
                <td className="p-2 text-center">{c.activo ? '● activo' : ''}</td>
                <td className="p-2 text-center">
                  {!c.activo && (
                    <form action={activarCiclo} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs text-verde hover:underline">Activar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-gray-500">Solo un ciclo puede estar activo a la vez.</p>
    </div>
  );
}
