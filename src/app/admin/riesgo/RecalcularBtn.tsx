'use client';
import { useState, useTransition } from 'react';
import { recalcularRiesgo } from './actions';

export function RecalcularBtn() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-verde-oscuro">{msg}</span>}
      <button
        disabled={pending}
        onClick={() => start(async () => {
          const r = await recalcularRiesgo();
          setMsg(r?.error ? `⚠️ ${r.error}` : `✅ ${r?.total ?? 0} alumnos analizados`);
        })}
        className="text-xs bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded disabled:opacity-50"
      >
        {pending ? 'Calculando…' : '🔄 Recalcular ahora'}
      </button>
    </div>
  );
}
