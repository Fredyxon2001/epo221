'use client';
// Marca el aviso como leído al montar (si aún no lo está).
import { useEffect } from 'react';
import { marcarAvisoLeido } from '@/app/avisos/actions';

export function MarcarLeidoClient({ avisoId, yaLeido }: { avisoId: string; yaLeido: boolean }) {
  useEffect(() => {
    if (yaLeido) return;
    const t = setTimeout(() => { marcarAvisoLeido(avisoId); }, 1500);
    return () => clearTimeout(t);
  }, [avisoId, yaLeido]);
  return null;
}
