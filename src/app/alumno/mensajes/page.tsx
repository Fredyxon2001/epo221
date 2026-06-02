// Hilos de mensajes del alumno con sus profesores.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';

function Avatar({ foto, ini, tone }: { foto: string | null; ini: string; tone: 'dorado' | 'verde' }) {
  return (
    <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold shadow ${tone === 'dorado' ? 'bg-gradient-to-br from-dorado to-dorado-claro text-verde-oscuro' : 'bg-gradient-to-br from-verde to-verde-medio text-white'}`}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={ini} className="w-full h-full object-cover" />
      ) : ini}
    </div>
  );
}

export default async function MensajesAlumno() {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  const { data: alumno } = await supabase.from('alumnos').select('id').eq('perfil_id', user!.id).maybeSingle();
  const alumnoId = alumno?.id ?? '';

  // ── Hilos con docentes ──
  const { data: hilosProf } = await supabase
    .from('mensajes_hilos')
    .select(`
      id, ultimo_mensaje_at,
      profesor:profesores(id, nombre, apellido_paterno, apellido_materno, perfil_id)
    `)
    .eq('alumno_id', alumnoId)
    .order('ultimo_mensaje_at', { ascending: false });

  const idsProf = (hilosProf ?? []).map((h: any) => h.id);
  const { data: noLeProf } = idsProf.length
    ? await supabase.from('mensajes').select('hilo_id')
        .in('hilo_id', idsProf).is('leido_at', null).eq('autor_tipo', 'profesor')
    : { data: [] as any[] };
  const countProf = new Map<string, number>();
  for (const m of noLeProf ?? []) countProf.set(m.hilo_id, (countProf.get(m.hilo_id) ?? 0) + 1);

  // fotos de los profesores (perfiles.avatar_url)
  const perfilIdsProf = (hilosProf ?? []).map((h: any) => h.profesor?.perfil_id).filter(Boolean);
  const fotoProf = new Map<string, string | null>();
  if (perfilIdsProf.length) {
    const { data: ps } = await supabase.from('perfiles').select('id, avatar_url').in('id', perfilIdsProf);
    for (const p of ps ?? []) fotoProf.set((p as any).id, (p as any).avatar_url ?? null);
  }

  // ── Hilos alumno ↔ alumno ──
  const { data: hilosAl } = alumnoId
    ? await supabase
        .from('hilos_alumno')
        .select('id, alumno_a, alumno_b, ultimo_mensaje_at')
        .or(`alumno_a.eq.${alumnoId},alumno_b.eq.${alumnoId}`)
        .order('ultimo_mensaje_at', { ascending: false })
    : { data: [] as any[] };

  const otroIds = (hilosAl ?? []).map((h: any) => (h.alumno_a === alumnoId ? h.alumno_b : h.alumno_a));
  const infoAlumno = new Map<string, any>();
  if (otroIds.length) {
    const { data: als } = await supabase.from('alumnos')
      .select('id, nombre, apellido_paterno, apellido_materno, foto_url').in('id', otroIds);
    for (const a of als ?? []) infoAlumno.set((a as any).id, a);
  }
  // no leídos alumno-alumno
  const idsAl = (hilosAl ?? []).map((h: any) => h.id);
  const { data: noLeAl } = idsAl.length
    ? await supabase.from('mensajes_alumno').select('hilo_id')
        .in('hilo_id', idsAl).is('leido_at', null).neq('autor_id', alumnoId)
    : { data: [] as any[] };
  const countAl = new Map<string, number>();
  for (const m of noLeAl ?? []) countAl.set(m.hilo_id, (countAl.get(m.hilo_id) ?? 0) + 1);

  const totalHilos = (hilosProf ?? []).length + (hilosAl ?? []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="💬 Mis mensajes"
        description="Conversa con tus docentes, orientador y compañeros."
        actions={
          <Link href="/alumno/mensajes/nuevo" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30 transition inline-flex items-center gap-2">
            + Nueva conversación
          </Link>
        }
      />

      <Card eyebrow="Docentes y orientador" title={`${(hilosProf ?? []).length} conversaciones`}>
        {(hilosProf ?? []).length === 0 ? (
          <EmptyState icon="👩‍🏫" title="Sin mensajes con docentes" description="Inicia una conversación con un docente." />
        ) : (
          <div className="space-y-1">
            {(hilosProf ?? []).map((h: any) => {
              const noLeidos = countProf.get(h.id) ?? 0;
              const foto = fotoProf.get(h.profesor?.perfil_id) ?? null;
              const ini = `${h.profesor?.nombre?.[0] ?? ''}${h.profesor?.apellido_paterno?.[0] ?? ''}`;
              return (
                <Link key={h.id} href={`/alumno/mensajes/${h.profesor?.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/70 hover:border-verde hover:shadow transition">
                  <Avatar foto={foto} ini={ini} tone="dorado" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">Prof. {h.profesor?.apellido_paterno} {h.profesor?.nombre}</div>
                    <div className="text-[11px] text-gray-500">{new Date(h.ultimo_mensaje_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {noLeidos > 0 && <Badge tone="rosa">{noLeidos}</Badge>}
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card eyebrow="Compañeros" title={`${(hilosAl ?? []).length} conversaciones`}>
        {(hilosAl ?? []).length === 0 ? (
          <EmptyState icon="🧑‍🤝‍🧑" title="Sin chats con compañeros" description="Inicia una conversación con un compañero desde 'Nueva conversación'." />
        ) : (
          <div className="space-y-1">
            {(hilosAl ?? []).map((h: any) => {
              const otroId = h.alumno_a === alumnoId ? h.alumno_b : h.alumno_a;
              const a = infoAlumno.get(otroId);
              const nombre = a ? `${a.nombre} ${a.apellido_paterno ?? ''} ${a.apellido_materno ?? ''}`.trim() : 'Compañero';
              const ini = `${a?.nombre?.[0] ?? ''}${a?.apellido_paterno?.[0] ?? ''}`;
              const noLeidos = countAl.get(h.id) ?? 0;
              return (
                <Link key={h.id} href={`/alumno/mensajes/companero/${h.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/70 hover:border-verde hover:shadow transition">
                  <Avatar foto={a?.foto_url ?? null} ini={ini} tone="verde" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{nombre}</div>
                    <div className="text-[11px] text-gray-500">{new Date(h.ultimo_mensaje_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
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
