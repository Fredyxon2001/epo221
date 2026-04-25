'use client';
import { useState, useTransition } from 'react';
import { recuperarPassword } from './actions';

export function RecuperarForm() {
  const [tipo, setTipo] = useState<'alumno' | 'profesor'>('alumno');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (ok) {
    return (
      <div className="p-6 text-center">
        <div className="text-5xl mb-3">🔓</div>
        <div className="font-serif text-lg text-verde-oscuro">Contraseña temporal generada</div>
        <div className="mt-3 bg-crema/60 border border-dorado rounded-xl p-4 font-mono text-xl tracking-widest text-verde-oscuro">
          {ok}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Inicia sesión con esta contraseña temporal. El sistema te pedirá cambiarla al entrar.
        </p>
        <a href="/login" className="inline-block mt-5 bg-verde text-white font-semibold px-5 py-2 rounded-lg hover:bg-verde-oscuro">
          Ir a iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('tipo', tipo);
        start(async () => {
          const res = await recuperarPassword(fd);
          if (res?.error) setErr(res.error);
          else if (res?.temporal) setOk(res.temporal);
        });
      }}
      className="p-6 space-y-4"
    >
      <div className="flex gap-2">
        {(['alumno','profesor'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 ${tipo === t ? 'bg-verde/10 border-verde text-verde-oscuro' : 'bg-white border-gray-200 text-gray-500'}`}
          >
            {t === 'alumno' ? '🎓 Soy alumno' : '👨‍🏫 Soy docente'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          {tipo === 'alumno' ? 'CURP' : 'RFC'}
        </span>
        <input
          name="clave1"
          required
          maxLength={18}
          placeholder={tipo === 'alumno' ? 'CURP (18 caracteres)' : 'RFC (13 caracteres)'}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:border-verde outline-none"
        />
      </label>

      {tipo === 'alumno' && (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Matrícula</span>
          <input
            name="clave2"
            required
            placeholder="Tu matrícula escolar"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde outline-none"
          />
        </label>
      )}

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">⚠️ {err}</div>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-verde hover:bg-verde-oscuro text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
      >
        {pending ? 'Verificando…' : 'Restablecer contraseña'}
      </button>

      <p className="text-[11px] text-gray-500 text-center">
        Si no recuerdas tus datos, pide apoyo a Control Escolar.
      </p>
    </form>
  );
}
