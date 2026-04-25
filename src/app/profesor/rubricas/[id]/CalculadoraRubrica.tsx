'use client';
// Calculadora en vivo: captura puntaje por criterio y muestra total ponderado
// normalizado a la escala máxima de la rúbrica.
import { useState } from 'react';

type Criterio = {
  id: string;
  nombre: string;
  peso: number;
  max_puntos: number;
};

export function CalculadoraRubrica({ criterios, escalaMax }: { criterios: Criterio[]; escalaMax: number }) {
  const [puntajes, setPuntajes] = useState<Record<string, number>>({});

  const pesoTotal = criterios.reduce((a, c) => a + Number(c.peso ?? 0), 0) || 1;

  // Cada criterio aporta: (puntaje/max_puntos) * peso, normalizado luego a escalaMax
  const aportes = criterios.map((c) => {
    const p = Number(puntajes[c.id] ?? 0);
    const frac = c.max_puntos > 0 ? Math.min(Math.max(p, 0), c.max_puntos) / c.max_puntos : 0;
    return frac * Number(c.peso ?? 0);
  });
  const fraccionTotal = aportes.reduce((a, b) => a + b, 0) / pesoTotal;
  const calif = +(fraccionTotal * escalaMax).toFixed(2);

  return (
    <div className="space-y-3">
      {criterios.map((c) => (
        <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/70">
          <div className="flex-1">
            <div className="font-semibold text-sm">{c.nombre}</div>
            <div className="text-[11px] text-gray-500">Peso {c.peso} · Máx {c.max_puntos}</div>
          </div>
          <input
            type="number"
            step="0.5"
            min={0}
            max={c.max_puntos}
            value={puntajes[c.id] ?? ''}
            onChange={(e) => setPuntajes((p) => ({ ...p, [c.id]: Number(e.target.value) }))}
            className="w-24 border border-gray-300 rounded-xl px-3 py-2 text-sm text-right"
            placeholder="0"
          />
        </div>
      ))}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-verde to-verde-medio text-white shadow">
        <div>
          <div className="text-xs opacity-80">Calificación resultante</div>
          <div className="text-[11px] opacity-70">Escala 0 – {escalaMax}</div>
        </div>
        <div className="text-3xl font-black tracking-tight">{isFinite(calif) ? calif : '—'}</div>
      </div>
    </div>
  );
}
