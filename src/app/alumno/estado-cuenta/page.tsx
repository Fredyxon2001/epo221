// Estado de cuenta: cargos pendientes, subir comprobantes, historial.
import { getAlumnoActual, getEstadoCuenta } from '@/lib/queries';
import { subirComprobante } from './actions';

const ETIQUETAS: Record<string, { color: string; label: string }> = {
  pendiente:    { color: 'bg-amber-100 text-amber-800',  label: 'Pendiente' },
  en_revision:  { color: 'bg-blue-100 text-blue-800',    label: 'En revisión' },
  pagado:       { color: 'bg-green-100 text-green-800',  label: 'Pagado' },
  cancelado:    { color: 'bg-gray-100 text-gray-600',    label: 'Cancelado' },
  vencido:      { color: 'bg-red-100 text-red-800',      label: 'Vencido' },
};

export default async function EstadoCuenta() {
  const alumno = (await getAlumnoActual())!;
  const cargos = await getEstadoCuenta(alumno.id);

  const pendientes = cargos.filter((c) => c.estatus === 'pendiente' || c.estatus === 'vencido');
  const total = pendientes.reduce((s, c) => s + Number(c.monto), 0);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Estado de cuenta</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Resumen label="Saldo pendiente" value={`$${total.toFixed(2)}`} accent />
        <Resumen label="Cargos pendientes" value={String(pendientes.length)} />
        <Resumen label="Total de movimientos" value={String(cargos.length)} />
      </div>

      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
        <header className="bg-verde text-white px-4 py-2 text-sm font-semibold">Movimientos</header>
        {cargos.length === 0 && (
          <div className="p-8 text-center text-gray-400">Sin movimientos registrados.</div>
        )}
        <div className="divide-y">
          {cargos.map((c) => {
            const e = ETIQUETAS[c.estatus] ?? ETIQUETAS.pendiente;
            const puedeSubir = c.estatus === 'pendiente' || c.estatus === 'vencido';
            return (
              <div key={c.cargo_id} className="p-4 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.concepto}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${e.color}`}>{e.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {c.fecha_limite && <>Vence: {c.fecha_limite} · </>}
                    Tipo: {c.tipo}
                  </div>
                  {c.intentos_pago && c.intentos_pago.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-verde cursor-pointer">
                        Ver {c.intentos_pago.length} comprobante(s)
                      </summary>
                      <ul className="mt-2 text-xs space-y-1">
                        {c.intentos_pago.map((p: any) => (
                          <li key={p.id} className="flex gap-2">
                            <span>{p.fecha}</span>
                            <span>·</span>
                            <span>${p.monto}</span>
                            <span>·</span>
                            <span>{p.metodo}</span>
                            {p.validado
                              ? <span className="text-green-600">✓ Validado {p.folio_recibo && `(${p.folio_recibo})`}</span>
                              : <span className="text-amber-600">⏳ En revisión</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">${Number(c.monto).toFixed(2)}</div>
                  {puedeSubir && (
                    <form action={subirComprobante} className="mt-2 flex flex-col gap-1">
                      <input type="hidden" name="cargo_id" value={c.cargo_id} />
                      <select name="metodo" required className="text-xs border rounded px-2 py-1">
                        <option value="transferencia">Transferencia</option>
                        <option value="ventanilla">Ventanilla</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                      <input name="referencia" placeholder="Referencia/Folio" className="text-xs border rounded px-2 py-1" />
                      <input type="file" name="comprobante" accept="image/*,.pdf" required className="text-xs" />
                      <button className="text-xs bg-verde text-white rounded px-2 py-1 hover:bg-verde-medio">
                        Subir comprobante
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Resumen({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-5 shadow-sm ${accent ? 'bg-dorado text-verde' : 'bg-white'}`}>
      <div className="text-xs uppercase opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
