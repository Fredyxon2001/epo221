'use client';
import { useState, useTransition, useRef } from 'react';
import { enviarMensajeSolicitud, cerrarSolicitudThread, reabrirSolicitudThread } from '@/app/solicitudes/thread-actions';

type Msg = {
  id: string;
  autor_tipo: string;
  texto: string;
  created_at: string;
  adjunto_url?: string | null;
  adjunto_nombre?: string | null;
  adjunto_tipo?: string | null;
  adjunto_tamano?: number | null;
  signedUrl?: string | null;
};

export function ConversacionSolicitud({
  solicitudId,
  estado,
  mensajes,
  miRol,
}: {
  solicitudId: string;
  estado: string;
  mensajes: Msg[];
  miRol: 'alumno' | 'profesor' | 'admin' | 'staff' | 'director';
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const cerrada = estado === 'cerrada';

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {mensajes.length === 0 && (
          <div className="text-xs text-gray-500 italic text-center py-2">Aún no hay mensajes en la conversación.</div>
        )}
        {mensajes.map((m) => {
          const esMio =
            (miRol === 'alumno' && m.autor_tipo === 'alumno') ||
            (miRol === 'profesor' && m.autor_tipo === 'profesor') ||
            (['admin', 'staff', 'director'].includes(miRol) && ['admin', 'staff', 'director'].includes(m.autor_tipo));
          return (
            <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-2.5 ${esMio ? 'bg-verde text-white' : 'bg-white border border-gray-200'}`}>
                <div className={`text-[10px] uppercase font-semibold mb-1 ${esMio ? 'text-verde-claro/80' : 'text-gray-500'}`}>
                  {m.autor_tipo} · {new Date(m.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                {m.texto && <div className="text-sm whitespace-pre-wrap">{m.texto}</div>}
                {m.adjunto_url && m.signedUrl && (
                  <a
                    href={m.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-1.5 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${esMio ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    📎 {m.adjunto_nombre ?? 'archivo'}
                    {m.adjunto_tamano != null && (
                      <span className="opacity-70">({Math.round(m.adjunto_tamano / 1024)} KB)</span>
                    )}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cerrada ? (
        <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
          <span className="text-xs text-gray-600">🔒 Esta solicitud está cerrada.</span>
          <form
            action={(fd) => {
              fd.set('id', solicitudId);
              start(async () => { await reabrirSolicitudThread(fd); });
            }}
          >
            <button type="submit" disabled={pending} className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-2 py-1 rounded disabled:opacity-50">
              {pending ? '…' : '🔓 Reabrir'}
            </button>
          </form>
        </div>
      ) : (
        <form
          ref={formRef}
          action={(fd) => {
            setErr(null);
            fd.set('solicitud_id', solicitudId);
            start(async () => {
              const r = await enviarMensajeSolicitud(fd);
              if (r?.error) setErr(r.error);
              else formRef.current?.reset();
            });
          }}
          className="space-y-2 bg-white border border-gray-200 rounded-lg p-3"
        >
          <textarea
            name="texto"
            rows={2}
            placeholder="Escribe un mensaje…"
            className="w-full border rounded px-3 py-2 text-sm resize-none"
          />
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <input
              type="file"
              name="adjunto"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
              className="text-xs flex-1"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded text-xs disabled:opacity-50">
                {pending ? 'Enviando…' : '✉️ Enviar'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm('¿Cerrar esta solicitud?')) return;
                  const fd = new FormData();
                  fd.set('id', solicitudId);
                  start(async () => { await cerrarSolicitudThread(fd); });
                }}
                className="bg-rose-100 text-rose-700 hover:bg-rose-200 font-semibold px-3 py-1.5 rounded text-xs disabled:opacity-50"
              >
                🔒 Cerrar
              </button>
            </div>
          </div>
          {err && <div className="text-xs text-rose-700">⚠️ {err}</div>}
        </form>
      )}
    </div>
  );
}
