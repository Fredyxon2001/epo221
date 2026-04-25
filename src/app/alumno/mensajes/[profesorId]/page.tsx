// Hilo de conversación alumno → profesor.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { enviarMensajeAlumno, marcarHiloLeido } from '@/app/profesor/mensajes/actions';
import { MessageComposer } from '@/components/mensajes/MessageComposer';
import { Adjunto } from '@/components/mensajes/Adjunto';

export default async function HiloAlumno({ params }: { params: { profesorId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: alumno } = await supabase.from('alumnos').select('id').eq('perfil_id', user!.id).single();

  const { data: profesor } = await supabase
    .from('profesores').select('id, nombre, apellido_paterno, apellido_materno, email')
    .eq('id', params.profesorId).single();
  if (!profesor) return <EmptyState icon="🔍" title="Profesor no encontrado" />;

  let { data: hilo } = await supabase.from('mensajes_hilos')
    .select('id').eq('profesor_id', params.profesorId).eq('alumno_id', alumno!.id).maybeSingle();
  if (!hilo) {
    const { data: nuevo } = await supabase.from('mensajes_hilos')
      .insert({ profesor_id: params.profesorId, alumno_id: alumno!.id, creado_por: 'alumno' })
      .select('id').single();
    hilo = nuevo as any;
  }

  if (hilo?.id) await marcarHiloLeido(hilo.id, 'alumno');

  const { data: mensajes } = hilo?.id
    ? await supabase.from('mensajes').select('*').eq('hilo_id', hilo.id).order('created_at')
    : { data: [] as any[] };

  const adjuntoPaths = (mensajes ?? []).filter((m: any) => m.adjunto_url).map((m: any) => m.adjunto_url as string);
  const signedMap: Record<string, string> = {};
  if (adjuntoPaths.length) {
    const { data: signed } = await supabase.storage.from('mensajes').createSignedUrls(adjuntoPaths, 3600);
    (signed ?? []).forEach((s: any) => { if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl; });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Mensajes"
        title={`Prof. ${profesor.apellido_paterno} ${profesor.nombre}`}
        description={profesor.email ?? undefined}
        actions={<Link href="/alumno/mensajes" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Todos los hilos</Link>}
      />

      <Card eyebrow="Conversación" title="">
        <div className="space-y-3 max-h-[55vh] overflow-y-auto p-2">
          {(mensajes ?? []).length === 0 ? (
            <EmptyState icon="💬" title="Hilo nuevo" description="Escribe el primer mensaje abajo." />
          ) : (
            (mensajes ?? []).map((m: any) => {
              const esMio = m.autor_tipo === 'alumno';
              const url = m.adjunto_url ? signedMap[m.adjunto_url] : null;
              return (
                <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow ${esMio ? 'bg-gradient-to-br from-verde to-verde-medio text-white' : 'bg-white border border-gray-200'}`}>
                    {m.solicitud_id && (
                      <a href="/alumno/solicitudes" className={`inline-flex items-center gap-1 text-[10px] font-bold mb-1 px-2 py-0.5 rounded-full ${esMio ? 'bg-white/25 text-white' : 'bg-dorado/30 text-verde-oscuro'}`}>
                        📋 Solicitud de revisión
                      </a>
                    )}
                    {m.cuerpo && <div className="text-sm whitespace-pre-wrap">{m.cuerpo}</div>}
                    {url && (
                      <Adjunto
                        signedUrl={url}
                        nombre={m.adjunto_nombre ?? 'archivo'}
                        tipo={m.adjunto_tipo ?? ''}
                        tamano={m.adjunto_tamano}
                        esMio={esMio}
                      />
                    )}
                    <div className={`text-[10px] mt-1 ${esMio ? 'text-white/70' : 'text-gray-500'}`}>
                      {new Date(m.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {esMio && (m.leido_at ? ' · ✓✓ leído' : ' · ✓ enviado')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <MessageComposer
          action={enviarMensajeAlumno}
          hidden={{ profesor_id: params.profesorId }}
        />
      </Card>
    </div>
  );
}
