// Listado de hilos de mensajes del profesor con sus alumnos.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';

export default async function MensajesProfesor({ searchParams }: { searchParams?: { q?: string } }) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const q = (searchParams?.q ?? '').trim();

  // Si hay búsqueda, primero localizamos hilos cuyos mensajes contengan el término
  let hilosFiltrados: string[] | null = null;
  let matchesPorHilo = new Map<string, number>();
  if (q) {
    const { data: msgs } = await supabase
      .from('mensajes')
      .select('hilo_id')
      .ilike('cuerpo', `%${q}%`)
      .limit(500);
    hilosFiltrados = Array.from(new Set((msgs ?? []).map((m: any) => m.hilo_id)));
    for (const m of msgs ?? []) matchesPorHilo.set(m.hilo_id, (matchesPorHilo.get(m.hilo_id) ?? 0) + 1);
  }

  let hilosQ = supabase
    .from('mensajes_hilos')
    .select(`
      id, ultimo_mensaje_at,
      alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)
    `)
    .eq('profesor_id', profesor?.id ?? '')
    .order('ultimo_mensaje_at', { ascending: false });
  if (hilosFiltrados !== null) {
    if (!hilosFiltrados.length) hilosQ = hilosQ.eq('id', '00000000-0000-0000-0000-000000000000');
    else hilosQ = hilosQ.in('id', hilosFiltrados);
  }
  const { data: hilos } = await hilosQ;

  // Conteo de no leídos por hilo
  const hilosIds = (hilos ?? []).map((h: any) => h.id);
  const { data: noLeidos } = hilosIds.length
    ? await supabase.from('mensajes').select('hilo_id')
        .in('hilo_id', hilosIds).is('leido_at', null).eq('autor_tipo', 'alumno')
    : { data: [] as any[] };
  const countPorHilo = new Map<string, number>();
  for (const m of noLeidos ?? []) countPorHilo.set(m.hilo_id, (countPorHilo.get(m.hilo_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="💬 Mensajes"
        description="Conversaciones directas con tus alumnos y tutores."
        actions={
          <Link href="/profesor/mensajes/nuevo" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30 transition inline-flex items-center gap-2">
            + Nueva conversación
          </Link>
        }
      />

      <form className="bg-white/70 border border-gray-200 rounded-xl p-3 flex gap-2 items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="🔎 Buscar palabra en todos los chats…"
          className="flex-1 border rounded px-3 py-1.5 text-sm"
        />
        <button className="text-sm bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-1.5 rounded">Buscar</button>
        {q && <a href="/profesor/mensajes" className="text-xs text-gray-500 hover:underline">limpiar</a>}
      </form>

      <Card eyebrow="Hilos activos" title={`${(hilos ?? []).length} conversaciones${q ? ` con "${q}"` : ''}`}>
        {(hilos ?? []).length === 0 ? (
          <EmptyState icon="💬" title="Sin mensajes aún" description="Cuando escribas a un alumno o te escriban, los hilos aparecerán aquí." />
        ) : (
          <div className="space-y-1">
            {(hilos ?? []).map((h: any) => {
              const noLe = countPorHilo.get(h.id) ?? 0;
              return (
                <Link
                  key={h.id}
                  href={`/profesor/mensajes/${h.alumno?.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/70 hover:border-verde hover:shadow transition"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-verde to-verde-medio text-white flex items-center justify-center font-bold shadow">
                    {h.alumno?.nombre?.[0]}{h.alumno?.apellido_paterno?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{h.alumno?.apellido_paterno} {h.alumno?.apellido_materno ?? ''} {h.alumno?.nombre}</div>
                    <div className="text-[11px] text-gray-500">{new Date(h.ultimo_mensaje_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {noLe > 0 && <Badge tone="rosa">{noLe}</Badge>}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
