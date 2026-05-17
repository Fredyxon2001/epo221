import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { crearPMI, actualizarPMI } from './actions';

export default async function PMIPage() {
  const supabase = createClient();
  const { data: pmis } = await supabase
    .from('pmi')
    .select('*, alumno:alumnos(id, matricula, nombre, apellido_paterno, apellido_materno), responsable:perfiles!pmi_responsable_id_fkey(nombre)')
    .order('created_at', { ascending: false });

  const { data: alumnos } = await supabase
    .from('alumnos').select('id, matricula, nombre, apellido_paterno, apellido_materno')
    .eq('estatus', 'activo').order('apellido_paterno');

  const filas = (pmis ?? []) as any[];
  const counts = { activo: 0, cumplido: 0, cancelado: 0 };
  for (const p of filas) (counts as any)[p.estado] = ((counts as any)[p.estado] ?? 0) + 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analítica · Riesgo"
        title="🎯 Plan de Mejora Individual (PMI)"
        description="Para alumnos en riesgo: objetivos, acciones, responsable y fecha de revisión."
      />

      <div className="grid grid-cols-3 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Activos</div><div className="text-3xl font-bold text-verde-oscuro">{counts.activo}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Cumplidos</div><div className="text-3xl font-bold text-verde">{counts.cumplido}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Cancelados</div><div className="text-3xl font-bold text-rose-700">{counts.cancelado}</div></Card>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer font-semibold text-sm text-verde-oscuro">➕ Nuevo PMI</summary>
          <form action={crearPMI} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs text-gray-600">Alumno *</span>
              <select name="alumno_id" required className="w-full border rounded px-2 py-1.5">
                <option value="">— Seleccionar —</option>
                {(alumnos ?? []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.matricula} · {a.nombre} {a.apellido_paterno} {a.apellido_materno}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">Fecha de revisión</span>
              <input name="fecha_revision" type="date" className="w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-600">Motivo / situación detectada *</span>
              <textarea name="motivo" required rows={2} className="w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-600">Objetivos *</span>
              <textarea name="objetivos" required rows={2} className="w-full border rounded px-2 py-1.5" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-600">Acciones a implementar *</span>
              <textarea name="acciones" required rows={3} className="w-full border rounded px-2 py-1.5" />
            </label>
            <div className="md:col-span-2">
              <button className="bg-verde hover:bg-verde-oscuro text-white text-sm font-semibold px-4 py-2 rounded">Crear PMI</button>
            </div>
          </form>
        </details>
      </Card>

      <Card>
        {filas.length === 0 ? (
          <EmptyState icon="🎯" title="Sin PMIs todavía" description="Crea uno usando el formulario superior." />
        ) : (
          <div className="space-y-3">
            {filas.map((p: any) => {
              const al = p.alumno;
              const nombre = al ? `${al.nombre} ${al.apellido_paterno ?? ''} ${al.apellido_materno ?? ''}`.trim() : '—';
              return (
                <div key={p.id} className={`border rounded-lg p-4 ${p.estado === 'cumplido' ? 'bg-verde-claro/10 border-verde' : p.estado === 'cancelado' ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'}`}>
                  <div className="flex justify-between items-start gap-3 flex-wrap mb-2">
                    <div>
                      <div className="font-semibold">{nombre} <span className="text-xs text-gray-500">({al?.matricula})</span></div>
                      <div className="text-xs text-gray-500">Inicio: {p.fecha_inicio} {p.fecha_revision ? ` · Revisión: ${p.fecha_revision}` : ''} {p.responsable?.nombre ? ` · Responsable: ${p.responsable.nombre}` : ''}</div>
                    </div>
                    <Badge tone={p.estado === 'cumplido' ? 'verde' : p.estado === 'cancelado' ? 'rosa' : 'ambar'} size="sm">{p.estado}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Motivo:</strong> {p.motivo}</div>
                    <div><strong>Objetivos:</strong> {p.objetivos}</div>
                    <div><strong>Acciones:</strong> {p.acciones}</div>
                    {p.resultado && <div><strong>Resultado:</strong> {p.resultado}</div>}
                  </div>
                  {p.estado === 'activo' && (
                    <form action={actualizarPMI} className="mt-3 flex gap-2 items-end flex-wrap pt-3 border-t border-amber-200">
                      <input type="hidden" name="id" value={p.id} />
                      <label className="flex-1 min-w-[200px]">
                        <span className="text-[10px] text-gray-500 uppercase">Resultado / cierre</span>
                        <input name="resultado" className="w-full border rounded px-2 py-1 text-xs" placeholder="¿Cómo terminó?" />
                      </label>
                      <select name="estado" className="border rounded px-2 py-1 text-xs">
                        <option value="cumplido">Marcar cumplido</option>
                        <option value="cancelado">Cancelar</option>
                      </select>
                      <button className="bg-verde-oscuro text-white text-xs font-semibold px-3 py-1.5 rounded">Guardar</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
