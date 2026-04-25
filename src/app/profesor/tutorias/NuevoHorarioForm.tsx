'use client';
import { useState, useTransition } from 'react';
import { guardarHorarioTutoria } from '@/app/tutorias/actions';

export function NuevoHorarioForm() {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          const r = await guardarHorarioTutoria(fd);
          if (r?.error) setErr(r.error);
        });
      }}
      className="flex flex-wrap gap-2 items-end"
    >
      <label>
        <span className="text-xs text-gray-600 block">Día</span>
        <select name="dia_semana" className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option>
          <option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option>
        </select>
      </label>
      <label><span className="text-xs text-gray-600 block">Inicio</span>
        <input name="hora_inicio" type="time" required className="border rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <label><span className="text-xs text-gray-600 block">Fin</span>
        <input name="hora_fin" type="time" required className="border rounded-lg px-2 py-1.5 text-sm" />
      </label>
      <label><span className="text-xs text-gray-600 block">Modalidad</span>
        <select name="modalidad" className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
          <option value="ambas">Ambas</option>
        </select>
      </label>
      <label className="flex-1 min-w-[140px]"><span className="text-xs text-gray-600 block">Lugar/Enlace</span>
        <input name="lugar" className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="Ej. Cubículo 3 o Meet" />
      </label>
      <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded-lg text-sm disabled:opacity-50">
        {pending ? '…' : '+ Agregar'}
      </button>
      {err && <div className="w-full text-xs text-rose-700">{err}</div>}
    </form>
  );
}
