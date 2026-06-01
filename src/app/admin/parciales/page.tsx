import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { guardarParcial, agregarParcial, eliminarParcial } from './actions';

export default async function AdminParciales() {
  const auth = createClient();
  const supabase = adminClient();
  const [{ data: ciclos }, { data: parciales }] = await Promise.all([
    supabase.from('ciclos_escolares').select('*').order('activo', { ascending: false }).order('codigo', { ascending: false }),
    supabase.from('parciales_config').select('*').order('numero'),
  ]);

  // Agrupar parciales por ciclo
  const byCiclo = new Map<string, any[]>();
  for (const p of parciales ?? []) {
    if (!byCiclo.has(p.ciclo_id)) byCiclo.set(p.ciclo_id, []);
    byCiclo.get(p.ciclo_id)!.push(p);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-verde">Parciales — fechas de captura</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define cuándo se puede capturar cada parcial. Cada institución puede usar 3, 4, 5 o hasta 6 parciales por ciclo según su modelo educativo.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          💡 <strong>Recomendación SEIEM:</strong> 3 parciales para Bachillerato General. Algunos planteles usan 4 para sincronizar con calendarios cuatrimestrales.
        </p>
      </div>

      {(ciclos ?? []).map((c: any) => {
        const parc = byCiclo.get(c.id) ?? [];
        const puedeAgregar = parc.length < 6;
        const gridCols = parc.length <= 3 ? 'md:grid-cols-3'
          : parc.length === 4 ? 'md:grid-cols-4'
          : parc.length === 5 ? 'md:grid-cols-5'
          : 'md:grid-cols-6';
        return (
          <section key={c.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <header className="bg-verde px-4 py-2 text-white font-semibold text-sm flex items-center justify-between">
              <span>{c.codigo} · {c.periodo} ({parc.length} parcial{parc.length === 1 ? '' : 'es'})</span>
              <div className="flex gap-2 items-center">
                {c.activo && <span className="bg-dorado text-verde text-[10px] font-bold px-2 py-0.5 rounded-full">Activo</span>}
                {puedeAgregar && (
                  <form action={agregarParcial}>
                    <input type="hidden" name="ciclo_id" value={c.id} />
                    <button type="submit" className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-2 py-1 rounded">
                      + Agregar parcial
                    </button>
                  </form>
                )}
              </div>
            </header>

            {parc.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Aún no hay parciales configurados para este ciclo. Haz clic en <strong>"+ Agregar parcial"</strong>.
              </div>
            ) : (
              <div className={`grid divide-y md:divide-y-0 md:divide-x ${gridCols}`}>
                {parc.map((p: any) => (
                  <div key={p.id} className="p-4 space-y-2">
                    <form action={guardarParcial} className="space-y-2">
                      <input type="hidden" name="ciclo_id" value={c.id} />
                      <input type="hidden" name="numero" value={p.numero} />
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-verde text-lg">Parcial {p.numero}</span>
                        {p.publicado && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Publicado</span>}
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Nombre interno</label>
                        <input name="nombre" defaultValue={p.nombre ?? ''} placeholder={`Parcial ${p.numero}`} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Abre captura</label>
                        <input name="abre_captura" type="date" defaultValue={p.abre_captura ?? ''} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Cierra captura</label>
                        <input name="cierra_captura" type="date" defaultValue={p.cierra_captura ?? ''} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input type="checkbox" name="publicado" defaultChecked={p.publicado ?? false} />
                        Publicar a los alumnos
                      </label>
                      <button type="submit" className="w-full bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio text-xs">
                        Guardar
                      </button>
                    </form>
                    {/* Eliminar (solo si es el último parcial y no está publicado) */}
                    {p.numero === parc.length && !p.publicado && parc.length > 1 && (
                      <form action={eliminarParcial}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="w-full text-rose-600 hover:bg-rose-50 text-[10px] font-semibold rounded px-2 py-1">
                          🗑 Eliminar
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
