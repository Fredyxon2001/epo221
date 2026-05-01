'use client';
import { useState, useTransition } from 'react';
import { adminResetPassword } from './reset-actions';

export function ResetPasswordRow({ perfilId, email, nombre }: { perfilId: string; email: string; nombre: string }) {
  const [pending, start] = useTransition();
  const [resultado, setResultado] = useState<{ tipo: 'temporal' | 'magic'; valor?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const ejecutar = (modo: 'temporal' | 'magic') => {
    setErr(null); setResultado(null); setCopiado(false);
    const msg = modo === 'temporal'
      ? `Generar password temporal para ${nombre || email}? Se mostrará una sola vez.`
      : `Enviar magic link a ${email}?`;
    if (!confirm(msg)) return;
    const fd = new FormData();
    fd.set('perfil_id', perfilId);
    fd.set('modo', modo);
    start(async () => {
      const r = await adminResetPassword(fd);
      if (r?.error) setErr(r.error);
      else setResultado({ tipo: modo, valor: r?.temporal });
    });
  };

  const copiar = () => {
    if (resultado?.valor) {
      navigator.clipboard.writeText(resultado.valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="space-y-1.5 inline-block text-right">
      <div className="flex gap-1 justify-end">
        <button
          type="button" disabled={pending}
          onClick={() => ejecutar('temporal')}
          className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white font-semibold px-2 py-1 rounded disabled:opacity-50"
          title="Generar password aleatoria (mostrarla en pantalla)"
        >
          {pending ? '…' : '🔑 Temporal'}
        </button>
        <button
          type="button" disabled={pending}
          onClick={() => ejecutar('magic')}
          className="text-[10px] bg-sky-600 hover:bg-sky-700 text-white font-semibold px-2 py-1 rounded disabled:opacity-50"
          title="Enviar magic link al correo"
        >
          {pending ? '…' : '📧 Magic'}
        </button>
      </div>
      {err && <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1 max-w-[260px]">⚠️ {err}</div>}
      {resultado?.tipo === 'temporal' && resultado.valor && (
        <div className="text-[10px] bg-amber-50 border border-amber-300 rounded p-2 max-w-[260px] text-left">
          <div className="font-semibold text-amber-800 mb-1">⚠️ Cópiala AHORA — solo se muestra una vez</div>
          <div className="flex items-center gap-1">
            <code className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-amber-200 flex-1 select-all">{resultado.valor}</code>
            <button type="button" onClick={copiar} className="text-[10px] bg-verde hover:bg-verde-oscuro text-white px-1.5 py-0.5 rounded">
              {copiado ? '✓' : '📋'}
            </button>
          </div>
          <div className="text-amber-700 mt-1">El usuario deberá cambiarla al iniciar sesión.</div>
        </div>
      )}
      {resultado?.tipo === 'magic' && (
        <div className="text-[10px] bg-sky-50 border border-sky-300 rounded p-2 max-w-[260px] text-left text-sky-800">
          ✅ Magic link enviado a <strong>{email}</strong>. Vence en 1 hora.
        </div>
      )}
    </div>
  );
}
