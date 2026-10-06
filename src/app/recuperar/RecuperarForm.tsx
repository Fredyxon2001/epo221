'use client';
import { useState, useTransition } from 'react';
import { recuperarPassword } from './actions';

export function RecuperarForm() {
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  return <div className="p-6 space-y-4">
    {sent ? <p role="status" className="text-sm text-verde-oscuro">Si el correo corresponde a una cuenta y recibe mensajes, enviaremos un enlace de recuperación. Revisa también el correo no deseado.</p> :
      <form action={data => { setError(''); start(async () => { const result = await recuperarPassword(data); if (result.error) setError(result.error); else setSent(true); }); }} className="space-y-4">
        <label className="block text-sm font-semibold text-gray-600">Correo de tu cuenta<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 w-full border rounded-lg p-3" /></label>
        <button disabled={pending} className="bg-verde text-white rounded-lg px-4 py-2">{pending ? 'Enviando…' : 'Solicitar enlace'}</button>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>}
    <p className="text-xs text-gray-600">Si tu usuario escolar no tiene un buzón de correo o perdiste el acceso, acude a Control Escolar. El personal verificará tu identidad y te entregará una clave individual. Nunca se restablece una contraseña únicamente con CURP, RFC o matrícula.</p>
  </div>;
}
