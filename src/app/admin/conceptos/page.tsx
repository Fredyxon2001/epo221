// CRUD de conceptos de pago. Editable 100% por admin (edición inline por fila).
import { createClient } from '@/lib/supabase/server';
import { crearConcepto, toggleConcepto, asignarMasivo, actualizarConcepto, eliminarConcepto } from './actions';

const TIPOS = [
  'inscripcion', 'cuota', 'extraordinario', 'constancia',
  'asesoria', 'credencial', 'material', 'evento', 'otro',
];

export default async function AdminConceptos() {
  const supabase = createClient();
  const { data: conceptos } = await supabase
    .from('conceptos_pago').select('*').order('tipo').order('nombre');

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Conceptos de pago</h1>
      <p className="text-sm text-gray-600 -mt-4">
        Puedes editar la clave, nombre, tipo y monto directamente en cada fila y presionar <strong>Guardar</strong>.
      </p>

      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-3">Nuevo concepto</h2>
        <form action={crearConcepto} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
          <input name="clave" placeholder="Clave única" required className="border rounded px-2 py-1" />
          <input name="nombre" placeholder="Nombre" required className="md:col-span-2 border rounded px-2 py-1" />
          <select name="tipo" className="border rounded px-2 py-1">
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input name="monto" type="number" step="0.01" placeholder="Monto" required className="border rounded px-2 py-1" />
          <button className="bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio">Crear</button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-2">Clave</th>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-right p-2">Monto</th>
              <th className="text-center p-2">Activo</th>
              <th className="text-center p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(conceptos ?? []).map((c) => (
              <tr key={c.id} className="border-t align-middle">
                <td colSpan={6} className="p-0">
                  <form action={actualizarConcepto} className="grid grid-cols-[140px_1fr_140px_120px_70px_auto] gap-2 items-center p-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="clave"
                      defaultValue={c.clave}
                      className="border rounded px-2 py-1 font-mono text-xs uppercase"
                    />
                    <input
                      name="nombre"
                      defaultValue={c.nombre}
                      className="border rounded px-2 py-1"
                    />
                    <select name="tipo" defaultValue={c.tipo} className="border rounded px-2 py-1">
                      {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      name="monto"
                      type="number"
                      step="0.01"
                      defaultValue={Number(c.monto).toFixed(2)}
                      className="border rounded px-2 py-1 text-right"
                    />
                    <span className="text-center">{c.activo ? '✓' : '—'}</span>
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                      <button className="text-xs bg-verde text-white rounded px-2 py-1 hover:bg-verde-medio">
                        Guardar
                      </button>
                    </div>
                  </form>
                  <div className="flex items-center justify-end gap-3 px-2 pb-2 text-xs">
                    <form action={toggleConcepto} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="activo" value={c.activo ? '0' : '1'} />
                      <button className="text-verde hover:underline">
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </form>
                    <form action={asignarMasivo} className="inline">
                      <input type="hidden" name="concepto_id" value={c.id} />
                      <button className="text-dorado hover:underline">Asignar a todos</button>
                    </form>
                    <form action={eliminarConcepto} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-rose-600 hover:underline">Eliminar</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
