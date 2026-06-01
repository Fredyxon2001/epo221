'use client';
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { enviarMensajeAlumno } from '../../alumno-actions';

export function ChatCompaneroForm({ hiloId }: { hiloId: string }) {
  const [texto, setTexto] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  const enviar = () => {
    if (!texto.trim()) return;
    setErr(null);
    const fd = new FormData();
    fd.set('hilo_id', hiloId);
    fd.set('cuerpo', texto.trim());
    start(async () => {
      const r = await enviarMensajeAlumno(fd);
      if (r?.error) setErr(r.error);
      else { setTexto(''); router.refresh(); ref.current?.focus(); }
    });
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          ref={ref}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Escribe un mensaje…"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-verde outline-none"
        />
        <button
          type="button" onClick={enviar} disabled={pending || !texto.trim()}
          className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {pending ? '…' : 'Enviar'}
        </button>
      </div>
      {err && <p className="text-xs text-rose-600 mt-2">⚠️ {err}</p>}
    </div>
  );
}
