// Validación de comprobantes de pago.
import { createClient } from '@/lib/supabase/server';
import { validarPago, rechazarPago } from './actions';

export default async function AdminPagos() {
  const supabase = createClient();
  const { data: pendientes } = await supabase
    .from('pagos')
    .select(`
      id, monto_pagado, metodo, referencia, fecha_pago,
      comprobante_url, subido_en, validado_en,
      cargo:cargos(id, monto, estatus, concepto:conceptos_pago(nombre)),
      alumno:alumnos(curp, matricula, nombre, apellido_paterno, apellido_materno)
    `)
    .is('validado_en', null)
    .order('subido_en', { ascending: false });

  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="font-serif text-3xl text-verde">Validar pagos</h1>
      <p className="text-sm text-gray-600">{pendientes?.length ?? 0} comprobante(s) pendiente(s).</p>

      <div className="space-y-3">
        {(pendientes ?? []).map((p: any) => (
          <div key={p.id} className="bg-white rounded-lg shadow-sm p-4 flex gap-4 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {p.alumno?.apellido_paterno} {p.alumno?.apellido_materno} {p.alumno?.nombre}
                </span>
                <span className="text-xs text-gray-500 font-mono">{p.alumno?.matricula ?? p.alumno?.curp}</span>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {p.cargo?.concepto?.nombre} — <strong>${p.monto_pagado}</strong>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {p.fecha_pago} · {p.metodo} {p.referencia && `· Ref: ${p.referencia}`}
              </div>
              {p.comprobante_url && (
                <a
                  href={`/api/comprobante?path=${encodeURIComponent(p.comprobante_url)}`}
                  target="_blank"
                  className="text-xs text-verde hover:underline mt-2 inline-block"
                >
                  📎 Ver comprobante
                </a>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <form action={validarPago}>
                <input type="hidden" name="pago_id" value={p.id} />
                <input type="hidden" name="cargo_id" value={p.cargo?.id} />
                <button className="bg-green-600 text-white text-xs px-4 py-2 rounded hover:bg-green-700">
                  ✓ Validar
                </button>
              </form>
              <form action={rechazarPago}>
                <input type="hidden" name="pago_id" value={p.id} />
                <input type="hidden" name="cargo_id" value={p.cargo?.id} />
                <input name="motivo" placeholder="Motivo" required
                       className="text-xs border rounded px-2 py-1 mb-1 w-full" />
                <button className="bg-red-600 text-white text-xs px-4 py-2 rounded hover:bg-red-700 w-full">
                  ✗ Rechazar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
