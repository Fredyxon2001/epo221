'use client';
import { useRef, useState, useTransition } from 'react';
import { enviarMensajeChat } from '@/app/chat-grupal/actions';

export function ChatGrupalForm({ asignacionId }: { asignacionId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setErr(null);
        fd.set('asignacion_id', asignacionId);
        start(async () => {
          const r = await enviarMensajeChat(fd);
          if (r?.error) setErr(r.error);
          else formRef.current?.reset();
        });
      }}
      className="flex gap-2 items-end"
    >
      <div className="flex-1 space-y-1">
        <textarea name="texto" rows={2} placeholder="Escribe un mensaje…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input name="archivo" type="file" className="text-xs" />
      </div>
      <button type="submit" disabled={pending}
        className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-3 rounded-lg disabled:opacity-50 text-sm">
        {pending ? '…' : 'Enviar'}
      </button>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </form>
  );
}
