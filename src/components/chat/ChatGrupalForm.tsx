'use client';
import { useRef, useState, useTransition } from 'react';
import { enviarMensajeChat } from '@/app/chat-grupal/actions';
import { EmojiFilePicker } from '@/components/EmojiFilePicker';

export function ChatGrupalForm({ asignacionId }: { asignacionId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function insertEmoji(e: string) {
    const ta = taRef.current;
    if (!ta) { setTexto((t) => t + e); return; }
    const s = ta.selectionStart ?? texto.length;
    const en = ta.selectionEnd ?? texto.length;
    const next = texto.slice(0, s) + e + texto.slice(en);
    setTexto(next);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + e.length; });
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setErr(null);
        fd.set('asignacion_id', asignacionId);
        fd.set('texto', texto);
        if (file) fd.set('archivo', file);
        start(async () => {
          const r = await enviarMensajeChat(fd);
          if (r?.error) setErr(r.error);
          else { setTexto(''); setFile(null); formRef.current?.reset(); }
        });
      }}
      className="space-y-2"
    >
      <textarea
        ref={taRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Escribe un mensaje…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde outline-none"
      />
      <div className="flex items-end justify-between gap-2">
        <EmojiFilePicker
          onInsertEmoji={insertEmoji}
          onFileChange={setFile}
          file={file}
          fileInputName="archivo"
        />
        <button type="submit" disabled={pending}
          className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50 text-sm shrink-0">
          {pending ? '…' : 'Enviar'}
        </button>
      </div>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </form>
  );
}
