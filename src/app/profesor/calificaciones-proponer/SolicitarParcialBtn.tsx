'use client';
import { useState, useTransition } from 'react';
import { solicitarParcial } from '@/app/admin/parciales/solicitudes/actions';

export function SolicitarParcialBtn({ asignacionId }: { asignacionId?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); setMsg(null); setErr(null); }}
        className="text-xs text-verde hover:text-verde-oscuro underline">
        📋 Solicitar al admin la apertura de un parcial
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setMsg(null); setErr(null);
        if (asignacionId) fd.set('asignacion_id', asignacionId);
        start(async () => {
          const r = await solicitarParcial(fd);
          if (r?.error) setErr(r.error);
          else {
            setMsg('✅ Solicitud enviada al admin. Recibirás notificación cuando se resuelva.');
            setTimeout(() => { setOpen(false); setMsg(null); }, 3000);
          }
        });
      }}
      className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-2 text-sm mt-2"
    >
      <div className="font-semibold text-sky-900 text-sm flex items-center justify-between">
        📋 Solicitar apertura de parcial al admin
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-rose-700 text-xs">✕ Cancelar</button>
      </div>
      <p className="text-xs text-sky-700">
        Si necesitas un parcial que aún no está abierto (o uno nuevo, ej. P4), llena este formulario.
        El admin recibirá la notificación y aprobará o rechazará.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-gray-600">Número del parcial (1-6)</span>
          <input name="numero" type="number" min="1" max="6" defaultValue="4" required
            className="mt-1 w-full border rounded px-2 py-1 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Nombre sugerido (opcional)</span>
          <input name="nombre_sugerido" placeholder="Ej. Parcial extraordinario"
            className="mt-1 w-full border rounded px-2 py-1 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-gray-600">Fecha sugerida de apertura</span>
          <input name="fecha_abre_sugerida" type="date"
            className="mt-1 w-full border rounded px-2 py-1 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Fecha sugerida de cierre</span>
          <input name="fecha_cierra_sugerida" type="date"
            className="mt-1 w-full border rounded px-2 py-1 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-gray-600">Motivo *</span>
        <textarea name="motivo" required rows={3} minLength={10}
          placeholder="Explica por qué necesitas este parcial. El admin lo verá al evaluar tu solicitud."
          className="mt-1 w-full border rounded px-2 py-1 text-sm" />
      </label>

      {asignacionId && (
        <div className="text-[10px] text-gray-500 italic">
          Esta solicitud está asociada a la asignación seleccionada arriba (queda registro de a qué materia/grupo aplica).
        </div>
      )}

      {err && <div className="text-xs text-rose-700 bg-rose-100 rounded p-2">⚠️ {err}</div>}
      {msg && <div className="text-xs text-verde-oscuro bg-verde-claro/30 rounded p-2">{msg}</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending}
          className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-4 py-2 rounded disabled:opacity-50">
          {pending ? 'Enviando…' : '📤 Enviar solicitud al admin'}
        </button>
      </div>
    </form>
  );
}
