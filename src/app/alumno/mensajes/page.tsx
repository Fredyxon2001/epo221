// Hilos de mensajes del alumno con sus profesores.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';

export default async function MensajesAlumno() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: alumno } = await supabase.from('alumnos').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: hilos } = await supabase
    .from('mensajes_hilos')
    .select(`
      id, ultimo_mensaje_at,
      profesor:profesores(id, nombre, apellido_paterno, apellido_materno)
    `)
    .eq('alumno_id', alumno?.id ?? '')
    .order('ultimo_mensaje_at', { ascending: false });

  const ids = (hilos ?? []).map((h: any) => h.id);
  const { data: noLe } = ids.length
    ? await supabase.from('mensajes').select('hilo_id')
        .in('hilo_id', ids).is('leido_at', null).eq('autor_tipo', 'profesor')
    : { data: [] as any[] };
  const count = new Map<string, number>();
  for (const m of noLe ?? []) count.set(m.hilo_id, (count.get(m.hilo_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="💬 Mis mensajes"
        description="Conversa con tus docentes y orientador."
        actions={
          <Link href="/alumno/mensajes/nuevo" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30 transition inline-flex items-center gap-2">
            + Nueva conversación
          </Link>
        }
      />
      <Card eyebrow="Conversaciones" title={`${(hilos ?? []).length} hilos`}>
        {(hilos ?? []).length === 0 ? (
          <EmptyState icon="💬" title="Sin mensajes" description="Cuando un docente te escriba o tú inicies un hilo, aparecerá aquí." />
        ) : (
          <div className="space-y-1">
            {(hilos ?? []).map((h: any) => {
              const noLeidos = count.get(h.id) ?? 0;
              return (
                <Link
                  key={h.id}
                  href={`/alumno/mensajes/${h.profesor?.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/70 hover:border-verde hover:shadow transition"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-dorado to-dorado-claro text-verde-oscuro flex items-center justify-center font-bold shadow">
                    {h.profesor?.nombre?.[0]}{h.profesor?.apellido_paterno?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">Prof. {h.profesor?.apellido_paterno} {h.profesor?.nombre}</div>
                    <div className="text-[11px] text-gray-500">{new Date(h.ultimo_mensaje_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {noLeidos > 0 && <Badge tone="rosa">{noLeidos}</Badge>}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
