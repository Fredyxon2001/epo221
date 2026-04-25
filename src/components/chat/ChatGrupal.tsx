import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ChatGrupalForm } from './ChatGrupalForm';

export async function ChatGrupal({ asignacionId, title }: { asignacionId: string; title: string }) {
  const supabase = createClient();
  const { data: mensajes } = await supabase.from('chat_grupal_mensajes')
    .select('*').eq('asignacion_id', asignacionId).order('created_at', { ascending: true }).limit(200);

  const admin = adminClient();
  const withUrls = await Promise.all((mensajes ?? []).map(async (m: any) => {
    if (!m.archivo_url) return m;
    const { data } = await admin.storage.from('chat-grupal').createSignedUrl(m.archivo_url, 3600);
    return { ...m, signedUrl: data?.signedUrl };
  }));

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{title}</div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3">
        {withUrls.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">Aún no hay mensajes. Sé el primero en escribir.</p>
        ) : (
          withUrls.map((m: any) => {
            const mine = m.autor_id === user?.id;
            const tone = m.autor_tipo === 'profesor' ? 'bg-verde text-white' :
                         m.autor_tipo === 'admin' ? 'bg-dorado text-white' :
                         mine ? 'bg-sky-100' : 'bg-white';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-2.5 border ${tone}`}>
                  <div className={`text-[10px] uppercase tracking-wider font-semibold ${mine && m.autor_tipo !== 'alumno' ? 'text-white/80' : 'text-gray-500'}`}>
                    {m.autor_nombre ?? 'Usuario'} · {m.autor_tipo}
                  </div>
                  {m.texto && <div className="text-sm whitespace-pre-wrap">{m.texto}</div>}
                  {m.signedUrl && (
                    <a href={m.signedUrl} target="_blank" className={`text-xs underline block mt-1 ${mine && m.autor_tipo !== 'alumno' ? 'text-white' : 'text-verde-oscuro'}`}>
                      📎 {m.archivo_nombre}
                    </a>
                  )}
                  <div className={`text-[9px] mt-1 ${mine && m.autor_tipo !== 'alumno' ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ChatGrupalForm asignacionId={asignacionId} />
    </div>
  );
}
