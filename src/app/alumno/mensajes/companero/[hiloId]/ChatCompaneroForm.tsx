'use client';
import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { enviarMensajeAlumno } from '../../alumno-actions';

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','🥰','😎','🤓','🤔',
  '😅','😢','😭','😡','😴','🤗','👍','👎','👏','🙌',
  '🙏','💪','✅','❌','⭐','🔥','💡','🎉','📚','📝',
  '🏀','⚽','🎮','🎵','🏆','🌟','❤️','💚','💛','💜',
];

export function ChatCompaneroForm({ hiloId }: { hiloId: string }) {
  const [texto, setTexto] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  function insertEmoji(e: string) {
    const inp = ref.current;
    if (!inp) { setTexto((t) => t + e); return; }
    const s = inp.selectionStart ?? texto.length;
    const en = inp.selectionEnd ?? texto.length;
    const next = texto.slice(0, s) + e + texto.slice(en);
    setTexto(next);
    requestAnimationFrame(() => { inp.focus(); inp.selectionStart = inp.selectionEnd = s + e.length; });
  }

  const enviar = () => {
    if (!texto.trim()) return;
    setErr(null);
    const fd = new FormData();
    fd.set('hilo_id', hiloId);
    fd.set('cuerpo', texto.trim());
    start(async () => {
      const r = await enviarMensajeAlumno(fd);
      if (r?.error) setErr(r.error);
      else { setTexto(''); setShowEmojis(false); router.refresh(); ref.current?.focus(); }
    });
  };

  return (
    <div>
      <div className="flex gap-2 items-center relative">
        <button
          type="button"
          onClick={() => setShowEmojis((v) => !v)}
          className="text-lg bg-white border border-gray-300 rounded-lg px-2 py-2 hover:bg-gray-50 shrink-0"
          title="Emojis"
        >😊</button>
        {showEmojis && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-10 gap-1 z-20 w-[320px]">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => insertEmoji(e)} className="text-xl hover:bg-gray-100 rounded p-1">{e}</button>
            ))}
          </div>
        )}
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
          className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded-xl disabled:opacity-50 shrink-0"
        >
          {pending ? '…' : 'Enviar'}
        </button>
      </div>
      {err && <p className="text-xs text-rose-600 mt-2">⚠️ {err}</p>}
    </div>
  );
}
