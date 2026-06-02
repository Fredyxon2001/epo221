import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ChatGrupalForm } from './ChatGrupalForm';

export async function ChatGrupal({ asignacionId, title }: { asignacionId: string; title: string }) {
  const auth = createClient();
  const admin = adminClient();
  const supabase = admin;
  const { data: mensajes } = await supabase.from('chat_grupal_mensajes')
    .select('*').eq('asignacion_id', asignacionId).order('created_at', { ascending: true }).limit(200);
  const withUrls = await Promise.all((mensajes ?? []).map(async (m: any) => {
    if (!m.archivo_url) return m;
    const { data } = await admin.storage.from('chat-grupal').createSignedUrl(m.archivo_url, 3600);
    return { ...m, signedUrl: data?.signedUrl };
  }));

  // Avatares de los autores (autor_id = perfil.id)
  const autorIds = Array.from(new Set((mensajes ?? []).map((m: any) => m.autor_id).filter(Boolean)));
  const avatarPorAutor = new Map<string, string | null>();
  if (autorIds.length) {
    const { data: perfiles } = await admin.from('perfiles').select('id, avatar_url').in('id', autorIds);
    for (const p of perfiles ?? []) avatarPorAutor.set((p as any).id, (p as any).avatar_url ?? null);
  }

  const { data: { user } } = await auth.auth.getUser();

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
            const avatar = avatarPorAutor.get(m.autor_id);
            const ini = (m.autor_nombre ?? 'U').split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase();
            const burbujaAvatar = (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-verde to-verde-medio flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={m.autor_nombre ?? ''} className="w-full h-full object-cover" />
                ) : ini}
              </div>
            );
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && burbujaAvatar}
                <div className={`max-w-[75%] rounded-xl p-2.5 border ${tone}`}>
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
                    {new Date(m.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', timeZone: 'America/Mexico_City' })}
                  </div>
                </div>
                {mine && burbujaAvatar}
              </div>
            );
          })
        )}
      </div>
      <ChatGrupalForm asignacionId={asignacionId} />
    </div>
  );
}
