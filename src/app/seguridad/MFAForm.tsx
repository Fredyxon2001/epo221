'use client';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function MFAForm({ factorId: existing, destination }: { factorId: string | null; destination: string }) {
  const client = useMemo(() => createClient(), []);
  const [factorId, setFactorId] = useState(existing);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function enroll() {
    setPending(true); setError('');
    try {
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      for (const factor of factors.data.all.filter(f => f.status === 'unverified')) {
        const removed = await client.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw removed.error;
      }
      const result = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'EPO 221', issuer: 'EPO 221' });
      if (result.error) throw result.error;
      setFactorId(result.data.id);
      const image = result.data.totp.qr_code;
      setQr(image.startsWith('data:') ? image : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`);
      setSecret(result.data.totp.secret);
    } catch { setError('No se pudo configurar el autenticador. Intenta nuevamente.'); }
    finally { setPending(false); }
  }
  async function verify(data: FormData) {
    if (!factorId) return;
    const code = String(data.get('code') ?? '').trim();
    if (!/^\d{6}$/.test(code)) { setError('Ingresa los 6 dígitos del autenticador.'); return; }
    setPending(true); setError('');
    try {
      const result = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) { setError('Código incorrecto o vencido. Intenta nuevamente.'); return; }
      setQr(''); setSecret('');
      window.location.assign(destination);
    } catch { setError('No se pudo verificar el código.'); }
    finally { setPending(false); }
  }
  return <div className="space-y-4">
    {!factorId && <button onClick={enroll} disabled={pending} className="bg-verde text-white rounded-lg px-4 py-2">Configurar autenticador</button>}
    {qr && <div className="space-y-2">
      {/* Supabase's QR is encoded as an image, never inserted as executable HTML. */}
      <img src={qr} alt="Código QR para configurar tu autenticador" width={240} height={240} />
      <details><summary className="text-sm cursor-pointer">Configurar manualmente</summary><code className="block break-all text-sm p-2 bg-crema">{secret}</code></details>
      <p className="text-xs text-gray-600">Escanea el QR con tu autenticador y escribe el código que muestra. No compartas este QR.</p>
    </div>}
    {factorId && <form action={verify} className="space-y-3">
      <label className="block text-sm font-semibold">Código del autenticador<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="mt-1 block w-full border rounded-lg p-3" /></label>
      <button disabled={pending} className="bg-verde text-white rounded-lg px-4 py-2">{pending ? 'Verificando…' : 'Verificar y continuar'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>;
}
