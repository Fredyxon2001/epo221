'use client';
import { useState, useTransition } from 'react';
import { editarRolUsuario } from './actions';

const ROLES_OPS = [
  { value: 'alumno', label: '🎓 Alumno' },
  { value: 'profesor', label: '👨‍🏫 Profesor' },
  { value: 'director', label: '🏛️ Director' },
  { value: 'admin', label: '⚙️ Admin' },
  { value: 'staff', label: '🛠️ Staff' },
  { value: 'finanzas', label: '💰 Finanzas' },
];

export function EditarRolDropdown({ perfilId, rolActual }: { perfilId: string; rolActual: string }) {
  const [editing, setEditing] = useState(false);
  const [rol, setRol] = useState(rolActual);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[10px] text-gray-500 hover:text-verde-oscuro underline"
      >
        Cambiar
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex gap-1 items-center">
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="text-[10px] border rounded px-1 py-0.5"
          disabled={pending}
        >
          {ROLES_OPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button
          type="button" disabled={pending || rol === rolActual}
          onClick={() => {
            setErr(null);
            const fd = new FormData(); fd.set('perfil_id', perfilId); fd.set('rol', rol);
            start(async () => {
              const r = await editarRolUsuario(fd);
              if (r?.error) setErr(r.error);
              else setEditing(false);
            });
          }}
          className="text-[10px] bg-verde hover:bg-verde-oscuro text-white px-1.5 py-0.5 rounded disabled:opacity-50"
        >
          {pending ? '…' : '✓'}
        </button>
        <button
          type="button" disabled={pending}
          onClick={() => { setRol(rolActual); setEditing(false); setErr(null); }}
          className="text-[10px] text-gray-500 hover:text-rose-700"
        >
          ✕
        </button>
      </div>
      {err && <div className="text-[10px] text-rose-700">{err}</div>}
    </div>
  );
}
