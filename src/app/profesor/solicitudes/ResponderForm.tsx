'use client';
import { useRef, useState, useTransition } from 'react';
import { responderSolicitud } from './actions';
import { EmojiFilePicker } from '@/components/EmojiFilePicker';

export function ResponderForm({ id }: { id: string }) {
  const [respuesta, setRespuesta] = useState('');
  const [decision, setDecision] = useState<'respondida' | 'aceptada' | 'rechazada'>('respondida');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertEmoji(e: string) {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? respuesta.length;
    const end = ta?.selectionEnd ?? respuesta.length;
    const nuevo = respuesta.slice(0, start) + e + respuesta.slice(end);
    setRespuesta(nuevo);
    requestAnimationFrame(() => {
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = start + e.length; }
    });
  }

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('id', id);
        fd.set('respuesta', respuesta);
        fd.set('decision', decision);
        if (file) fd.set('adjunto', file);
        start(async () => {
          const res = await responderSolicitud(fd);
          if (res?.error) setErr(res.error);
        });
      }}
      encType="multipart/form-data"
      className="mt-4 space-y-3 bg-white border border-gray-200 rounded-xl p-4"
    >
      <div className="flex gap-2 flex-wrap">
        {([
          ['aceptada',   '✅ Acepto la revisión',  'bg-verde-claro/30 border-verde text-verde-oscuro'],
          ['rechazada',  '❌ Rechazo la solicitud', 'bg-rose-100 border-rose-300 text-rose-700'],
          ['respondida', '💬 Solo responder',       'bg-sky-100 border-sky-300 text-sky-700'],
        ] as const).map(([v, l, cls]) => (
          <button
            key={v}
            type="button"
            onClick={() => setDecision(v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition ${decision === v ? cls : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        rows={4}
        required
        minLength={10}
        placeholder="Escribe una respuesta clara para el alumno. Explica el criterio, la evidencia considerada, o los pasos a seguir."
        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none"
      />

      <EmojiFilePicker onInsertEmoji={insertEmoji} onFileChange={setFile} file={file} />

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-2.5">⚠️ {err}</div>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || respuesta.length < 10}
          className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg shadow-md shadow-verde/30 disabled:opacity-50"
        >
          {pending ? 'Enviando…' : 'Enviar respuesta'}
        </button>
      </div>
    </form>
  );
}
