import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { ProcesarExtraordinarioForm } from './ProcesarExtraordinarioForm';

const ESTADOS = ['solicitado', 'pago_pendiente', 'pagado', 'agendado', 'aplicado', 'calificado', 'rechazado'];

export default async function AdminExtraordinarios({ searchParams }: { searchParams: { estado?: string } }) {
  const supabase = createClient();
  const estado = searchParams.estado ?? 'solicitado';

  let q = supabase.from('examenes_extraordinarios')
    .select('*, alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula), asignacion:asignaciones(materia:materias(nombre))')
    .order('created_at', { ascending: false });
  if (estado !== 'todos') q = q.eq('estado', estado);
  const { data: lista } = await q;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Control escolar"
        title="📘 Extraordinarios y recuperación"
        description="Revisa, cobra, agenda y califica los exámenes solicitados."
      />

      <div className="flex flex-wrap gap-2">
        {['todos', ...ESTADOS].map((e) => (
          <a key={e} href={`?estado=${e}`}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${e === estado ? 'bg-verde text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {e}
          </a>
        ))}
      </div>

      <Card>
        {(lista ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Sin solicitudes en este estado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {lista!.map((s: any) => (
              <div key={s.id} className="py-3">
                <div className="flex justify-between gap-2 items-start">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">
                      {s.alumno?.apellido_paterno} {s.alumno?.apellido_materno ?? ''} {s.alumno?.nombre} · {s.alumno?.matricula ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">{s.asignacion?.materia?.nombre ?? '—'} · {s.tipo} · {new Date(s.created_at).toLocaleDateString('es-MX')}</div>
                    {s.motivo && <p className="text-xs text-gray-700 italic mt-1">"{s.motivo}"</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 font-semibold shrink-0">{s.estado}</span>
                </div>
                <ProcesarExtraordinarioForm solicitud={s} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
