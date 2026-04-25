'use client';
import { useState, useTransition } from 'react';
import { cambiarPassword } from './actions';

export function CambiarPasswordForm({ sugerida }: { sugerida: boolean }) {
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const coincide = nueva.length >= 8 && nueva === confirma;

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          const res = await cambiarPassword(fd);
          if (res?.error) setErr(res.error);
        });
      }}
      className="p-6 space-y-4"
    >
      {sugerida && (
        <div className="bg-dorado/20 border border-dorado/50 rounded-lg p-3 text-xs text-verde-oscuro">
          💡 <strong>Sugerencia:</strong> usa tu matrícula como contraseña para recordarla fácilmente,
          o crea una con al menos 8 caracteres (letras + números).
        </div>
      )}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Nueva contraseña</span>
        <input
          type="password"
          name="nueva"
          required
          minLength={8}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Confirmar contraseña</span>
        <input
          type="password"
          name="confirma"
          required
          minLength={8}
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none"
        />
        {confirma.length > 0 && !coincide && (
          <span className="text-xs text-rose-500 mt-1 block">
            {nueva.length < 8 ? 'Mínimo 8 caracteres' : 'No coinciden'}
          </span>
        )}
      </label>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">⚠️ {err}</div>}

      <button
        type="submit"
        disabled={pending || !coincide}
        className="w-full bg-verde hover:bg-verde-oscuro text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
      >
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
