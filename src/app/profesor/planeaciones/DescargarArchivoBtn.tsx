'use client';
import { useTransition } from 'react';
import { getSignedPlaneacionUrl } from '@/app/planeaciones/actions';

export function DescargarArchivoBtn({ path, nombre }: { path: string; nombre: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        const url = await getSignedPlaneacionUrl(path);
        if (url) window.open(url, '_blank');
      })}
      title={nombre}
      className="text-xs bg-verde hover:bg-verde-oscuro text-white font-semibold px-2 py-1 rounded disabled:opacity-50"
    >
      📎 {pending ? '…' : 'Archivo'}
    </button>
  );
}
