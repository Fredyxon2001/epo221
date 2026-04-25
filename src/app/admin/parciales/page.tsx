import { createClient } from '@/lib/supabase/server';
import { guardarParcial } from './actions';

export default async function AdminParciales() {
  const supabase = createClient();
  const [{ data: ciclos }, { data: parciales }] = await Promise.all([
    supabase.from('ciclos_escolares').select('*').order('activo', { ascending: false }).order('codigo', { ascending: false }),
    supabase.from('parciales_config').select('*'),
  ]);

  const byKey = new Map<string, any>();
  for (const p of parciales ?? []) byKey.set(`${p.ciclo_id}|${p.numero}`, p);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-verde">Parciales — fechas de captura</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define cuándo se puede capturar cada parcial. Fuera de la ventana, profesores ven el parcial
          en modo lectura.
        </p>
      </div>

      {(ciclos ?? []).map((c: any) => (
        <section key={c.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
          <header className="bg-verde px-4 py-2 text-white font-semibold text-sm flex items-center justify-between">
            <span>{c.codigo} · {c.periodo}</span>
            {c.activo && <span className="bg-dorado text-verde text-[10px] font-bold px-2 py-0.5 rounded-full">Activo</span>}
          </header>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
            {[1, 2, 3].map((num) => {
              const p = byKey.get(`${c.id}|${num}`);
              return (
                <form key={num} action={guardarParcial} className="p-4 space-y-2">
                  <input type="hidden" name="ciclo_id" value={c.id} />
                  <input type="hidden" name="numero" value={num} />
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-verde text-lg">Parcial {num}</span>
                    {p?.publicado && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Publicado</span>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Nombre interno</label>
                    <input name="nombre" defaultValue={p?.nombre ?? ''} placeholder={`Parcial ${num}`} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Abre captura</label>
                    <input name="abre_captura" type="date" defaultValue={p?.abre_captura ?? ''} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Cierra captura</label>
                    <input name="cierra_captura" type="date" defaultValue={p?.cierra_captura ?? ''} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" name="publicado" defaultChecked={p?.publicado ?? false} />
                    Publicar calificaciones a los alumnos
                  </label>
                  <button type="submit" className="w-full bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio text-xs mt-2">
                    Guardar
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
