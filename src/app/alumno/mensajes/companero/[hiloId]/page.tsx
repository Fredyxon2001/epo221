// Conversación directa entre dos alumnos del mismo grupo.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from '@/components/privado/ui';
import { ChatCompaneroForm } from './ChatCompaneroForm';

export default async function ConversacionCompanero({ params }: { params: { hiloId: string } }) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  const { data: yo } = await supabase.from('alumnos').select('id, nombre').eq('perfil_id', user.id).maybeSingle();
  if (!yo) redirect('/alumno');

  const { data: hilo } = await supabase
    .from('hilos_alumno')
    .select('id, alumno_a, alumno_b')
    .eq('id', params.hiloId)
    .maybeSingle();
  if (!hilo || (hilo.alumno_a !== yo.id && hilo.alumno_b !== yo.id)) {
    return (
      <div className="max-w-2xl">
        <PageHeader eyebrow="Mensajes" title="Conversación no disponible" />
        <Card><p className="text-sm text-gray-500 py-6 text-center">No tienes acceso a esta conversación.</p></Card>
      </div>
    );
  }

  const otroId = hilo.alumno_a === yo.id ? hilo.alumno_b : hilo.alumno_a;
  const { data: otro } = await supabase
    .from('alumnos').select('nombre, apellido_paterno, apellido_materno').eq('id', otroId).maybeSingle();
  const otroNombre = otro
    ? `${otro.nombre} ${otro.apellido_paterno ?? ''} ${otro.apellido_materno ?? ''}`.trim()
    : 'Compañero';

  const { data: mensajes } = await supabase
    .from('mensajes_alumno')
    .select('id, autor_id, cuerpo, created_at')
    .eq('hilo_id', params.hiloId)
    .order('created_at', { ascending: true })
    .limit(300);

  // Marcar como leídos los que no son míos
  await supabase.from('mensajes_alumno')
    .update({ leido_at: new Date().toISOString() })
    .eq('hilo_id', params.hiloId).neq('autor_id', yo.id).is('leido_at', null);

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        eyebrow="Mensaje a compañero"
        title={otroNombre}
        actions={<Link href="/alumno/mensajes" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />
      <Card>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto mb-4">
          {(mensajes ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aún no hay mensajes. ¡Escribe el primero!</p>
          ) : (
            (mensajes ?? []).map((m: any) => {
              const mine = m.autor_id === yo.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-verde text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <div className="text-sm">{m.cuerpo}</div>
                    <div className={`text-[9px] mt-1 ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(m.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <ChatCompaneroForm hiloId={params.hiloId} />
      </Card>
    </div>
  );
}
