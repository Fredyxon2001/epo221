'use client';
// Conserva el marcado normal después de mostrar el aviso sin la guía encima.
import { useEffect } from 'react';
import { marcarAvisoLeido } from '@/app/avisos/actions';
import { deferNoticeReading } from '@/lib/help/notice-reading';

export function MarcarLeidoClient({ avisoId, yaLeido }: { avisoId: string; yaLeido: boolean }) {
  useEffect(() => {
    if (yaLeido) return;
    return deferNoticeReading(() => { void marcarAvisoLeido(avisoId); });
  }, [avisoId, yaLeido]);
  return null;
}
