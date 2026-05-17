'use client';
import { useState, useTransition } from 'react';
import { actualizarFicha } from './actions';

export function FichaForm({ a, modificacionesUsadas, solicitudPendiente }: {
  a: any;
  modificacionesUsadas: number;
  solicitudPendiente: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err' | 'solicitada'; texto: string } | null>(null);
  const restantesLibres = Math.max(0, 2 - modificacionesUsadas);
  const requiereAprobacion = restantesLibres === 0;

  return (
    <form
      action={(fd) => {
        setMsg(null);
        start(async () => {
          const r = await actualizarFicha(fd);
          if (r?.error && !r.ok) setMsg({ tipo: 'err', texto: r.error });
          else if (r?.modo === 'aplicada') setMsg({ tipo: 'ok', texto: `✅ Datos actualizados. Te quedan ${r?.restantes ?? 0} modificación(es) libre(s).` });
          else if (r?.modo === 'solicitada') setMsg({ tipo: 'solicitada', texto: '📝 Solicitud enviada al admin. Acude a Control Escolar para justificar tu cambio.' });
        });
      }}
      className="bg-white rounded-lg p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm uppercase text-gray-500">Datos de contacto</h2>
        <ContadorBadge usadas={modificacionesUsadas} />
      </div>

      {solicitudPendiente && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-800">
          ⏳ Tienes una solicitud de modificación <strong>pendiente</strong> de aprobación por Control Escolar.
        </div>
      )}

      {requiereAprobacion && !solicitudPendiente && (
        <div className="bg-sky-50 border border-sky-300 rounded p-3 text-xs text-sky-800 space-y-1">
          <div className="font-semibold">⚠️ Ya usaste tus 2 modificaciones libres</div>
          <p>
            Para más cambios necesitas <strong>escribir un motivo</strong> y luego <strong>acudir a Control Escolar</strong> para justificar.
            El admin revisará tu solicitud y aceptará o rechazará.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="email" label="Correo electrónico" type="email" defaultValue={a.email ?? ''} />
        <Field name="telefono" label="Teléfono" defaultValue={a.telefono ?? ''} />
        <Field name="direccion" label="Dirección" defaultValue={a.direccion ?? ''} full />
        <Field name="codigo_postal" label="Código postal" defaultValue={a.codigo_postal ?? ''} />
        <Field name="municipio" label="Municipio" defaultValue={a.municipio ?? ''} />
      </div>

      <h2 className="text-sm uppercase text-gray-500 pt-4 border-t">Tutor / responsable</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field name="tutor_nombre" label="Nombre del tutor" defaultValue={a.tutor_nombre ?? ''} />
        <Field name="tutor_parentesco" label="Parentesco" defaultValue={a.tutor_parentesco ?? ''} />
        <Field name="tutor_telefono" label="Teléfono del tutor" defaultValue={a.tutor_telefono ?? ''} />
        <Field name="tutor_email" label="Correo del tutor" type="email" defaultValue={a.tutor_email ?? ''} />
      </div>

      {requiereAprobacion && (
        <label className="block pt-4 border-t">
          <span className="text-xs text-gray-600 font-semibold">📝 Motivo de la modificación (requerido — mínimo 15 caracteres)</span>
          <textarea
            name="motivo" rows={3} minLength={15} required={requiereAprobacion}
            placeholder="Explica claramente por qué necesitas modificar tu ficha. Esta información será revisada por Control Escolar."
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:border-verde focus:ring-1 focus:ring-verde outline-none"
          />
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            Después de enviar, debes acudir físicamente a Control Escolar para que tu solicitud sea aprobada.
          </span>
        </label>
      )}

      {msg && (
        <div className={`rounded p-3 text-sm ${
          msg.tipo === 'ok' ? 'bg-verde-claro/30 border border-verde text-verde-oscuro' :
          msg.tipo === 'solicitada' ? 'bg-sky-50 border border-sky-300 text-sky-800' :
          'bg-rose-50 border border-rose-300 text-rose-700'
        }`}>{msg.texto}</div>
      )}

      <button
        type="submit" disabled={pending || solicitudPendiente}
        className="bg-verde hover:bg-verde-medio text-white font-semibold px-6 py-2 rounded-md transition disabled:opacity-50"
      >
        {pending ? 'Guardando…' : requiereAprobacion ? '📤 Solicitar al admin' : '💾 Guardar cambios'}
      </button>
    </form>
  );
}

function Field({ name, label, type = 'text', defaultValue, full = false }: any) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <input
        name={name} type={type} defaultValue={defaultValue}
        className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:border-verde focus:ring-1 focus:ring-verde outline-none"
      />
    </label>
  );
}

function ContadorBadge({ usadas }: { usadas: number }) {
  const restantes = Math.max(0, 2 - usadas);
  const color = restantes === 0 ? 'bg-rose-100 text-rose-700' : restantes === 1 ? 'bg-amber-100 text-amber-800' : 'bg-verde-claro/30 text-verde-oscuro';
  return (
    <div className={`text-[11px] font-semibold px-3 py-1 rounded-full ${color}`}>
      {restantes > 0 ? `${restantes} modificación(es) libre(s) restante(s)` : '0 libres · requiere aprobación'}
    </div>
  );
}
