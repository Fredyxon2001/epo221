'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { abrirHiloConCompanero } from '../alumno-actions';

export function AbrirHiloCompaneroBtn({ alumnoId }: { alumnoId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await abrirHiloConCompanero(alumnoId);
        if (r.hiloId) router.push(`/alumno/mensajes/companero/${r.hiloId}`);
        else if (r.error) alert(r.error);
      })}
      className="text-xs bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 whitespace-nowrap"
    >
      {pending ? '…' : '💬 Escribir'}
    </button>
  );
}
