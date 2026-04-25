'use client';
// Lanza todas las boletas en pestañas nuevas con un delay pequeño entre cada una
// para no saturar el navegador ni el serverless de /api/boleta.
import { useState } from 'react';

export function BoletasLauncher({ alumnos }: { alumnos: { id: string; nombre: string }[] }) {
  const [estado, setEstado] = useState<'idle' | 'abriendo' | 'listo'>('idle');
  const [actual, setActual] = useState(0);

  async function lanzar() {
    setEstado('abriendo');
    for (let i = 0; i < alumnos.length; i++) {
      setActual(i + 1);
      window.open(`/api/boleta/${alumnos[i].id}`, '_blank', 'noopener');
      // Pequeña pausa para que el navegador abra las pestañas sin bloquearlas
      await new Promise((r) => setTimeout(r, 250));
    }
    setEstado('listo');
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={lanzar}
        disabled={estado === 'abriendo' || alumnos.length === 0}
        className="bg-gradient-to-r from-verde to-verde-medio text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-verde/30 hover:shadow-xl hover:shadow-verde/40 disabled:opacity-50 transition"
      >
        {estado === 'abriendo'
          ? `Generando ${actual}/${alumnos.length}…`
          : estado === 'listo'
          ? `✓ ${alumnos.length} boletas generadas`
          : `📄 Abrir todas las boletas (${alumnos.length})`}
      </button>
      <span className="text-xs text-gray-500">
        Se abrirán en pestañas nuevas. Habilita popups si el navegador los bloquea.
      </span>
    </div>
  );
}
