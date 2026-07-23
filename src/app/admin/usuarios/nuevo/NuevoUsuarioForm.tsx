'use client';
import { useState, useTransition } from 'react';
import { crearUsuarioGenerico } from '../actions';

type Grupo = {
  id: string;
  grado: number;
  semestre: number;
  grupo: number;
  turno: string | null;
  orientador_id: string | null;
  orientador?: { nombre: string; apellido_paterno: string } | null;
};

const ROLES = [
  { value: 'profesor', label: '👨‍🏫 Profesor / Orientador', hint: 'Da clases, puede orientar grupos o ambos' },
  { value: 'director', label: '🏛️ Director', hint: 'Vista ejecutiva e institucional' },
  { value: 'admin', label: '⚙️ Administrador', hint: 'Control total del sistema' },
  { value: 'staff', label: '🛠️ Staff / Control Escolar', hint: 'Gestión académica sin acceso financiero' },
  { value: 'finanzas', label: '💰 Finanzas', hint: 'Pagos, conceptos, estado de cuenta de alumnos' },
] as const;

export function NuevoUsuarioForm({ grupos }: { grupos: Grupo[] }) {
  const [rol, setRol] = useState<string>('profesor');
  const [daClases, setDaClases] = useState(true);
  const [esOrientador, setEsOrientador] = useState(false);
  const [generarPwd, setGenerarPwd] = useState(true);
  const [pending, start] = useTransition();
  const [resultado, setResultado] = useState<{ tipo: 'ok' | 'error'; mensaje: string; temporal?: string } | null>(null);

  const handleSubmit = (fd: FormData) => {
    setResultado(null);
    fd.set('rol', rol);
    if (rol === 'profesor') {
      fd.set('da_clases', daClases ? '1' : '0');
      fd.set('es_orientador', esOrientador ? '1' : '0');
    }
    start(async () => {
      const r = await crearUsuarioGenerico(fd);
      if (r?.error) setResultado({ tipo: 'error', mensaje: r.error });
      else setResultado({ tipo: 'ok', mensaje: '✅ Usuario creado exitosamente', temporal: r?.temporal });
    });
  };

  const gruposDisponibles = grupos.filter((g) => !g.orientador_id);

  return (
    <form action={handleSubmit} className="space-y-4 text-sm">
      {/* Datos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-600 font-semibold">Correo electrónico *</span>
          <input name="email" type="email" required className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder="usuario@epo221.edu.mx" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600 font-semibold">Rol *</span>
          <select value={rol} onChange={(e) => setRol(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <span className="text-[10px] text-gray-500 mt-0.5 block">{ROLES.find((r) => r.value === rol)?.hint}</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-gray-600 font-semibold">Nombre(s) *</span>
          <input name="nombre" required className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600 font-semibold">Apellido paterno *</span>
          <input name="apellido_paterno" required className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600 font-semibold">Apellido materno</span>
          <input name="apellido_materno" className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
      </div>

      {/* Datos extra para profesor */}
      {rol === 'profesor' && (
        <div className="bg-verde-claro/10 border border-verde/20 rounded-lg p-4 space-y-3">
          <div className="font-semibold text-verde-oscuro text-sm">📋 Datos del profesor / orientador</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-600 font-semibold">RFC (para constancia de servicio)</span>
              <input name="rfc" className="mt-1 w-full border rounded-lg px-3 py-2" maxLength={13} placeholder="XAXX010101000" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600 font-semibold">Teléfono</span>
              <input name="telefono" type="tel" className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="55 1234 5678" />
            </label>
          </div>

          <div className="flex flex-col gap-2 bg-white rounded p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-700">¿Qué rol funcional tendrá?</span>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={daClases} onChange={(e) => setDaClases(e.target.checked)} />
              <span>👨‍🏫 <strong>Da clases</strong> (será maestro de una o varias materias)</span>
              <span className="text-[10px] text-gray-500 ml-1">(luego asignas materias en /admin/asignaciones)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={esOrientador} onChange={(e) => setEsOrientador(e.target.checked)} />
              <span>🧭 <strong>Es orientador</strong> (acompaña uno o varios grupos)</span>
            </label>
            {!daClases && !esOrientador && (
              <div className="text-[11px] text-amber-700 mt-1">
                ⚠️ Selecciona al menos un rol funcional (clases u orientación), o ambos.
              </div>
            )}
          </div>

          {esOrientador && (
            <div className="bg-white rounded p-3 border border-amber-300">
              <span className="text-xs font-semibold text-amber-800 block mb-2">
                Selecciona los grupos que orientará (máx. 4):
              </span>
              {gruposDisponibles.length === 0 ? (
                <div className="text-xs text-gray-500 italic">
                  No hay grupos disponibles sin orientador. Primero libera un grupo desde /admin/grupos.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {gruposDisponibles.map((g) => (
                    <label key={g.id} className="inline-flex items-center gap-2 text-xs border border-gray-200 rounded p-2 hover:bg-amber-50 cursor-pointer">
                      <input type="checkbox" name="grupos_orientador[]" value={g.id} />
                      <span>
                        <strong>{g.grado}°{String.fromCharCode(64 + (g.grupo ?? 1))}</strong>
                        <span className="text-gray-500 ml-1">({g.turno})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contraseña */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="font-semibold text-gray-700 text-sm">🔑 Contraseña inicial</div>
        <div className="flex gap-3 items-center">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="pwd_modo" checked={generarPwd} onChange={() => setGenerarPwd(true)} />
            <span>🎲 <strong>Generar aleatoria</strong> (recomendado, 12 caracteres seguros)</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" name="pwd_modo" checked={!generarPwd} onChange={() => setGenerarPwd(false)} />
            <span>✏️ <strong>Definirla yo</strong></span>
          </label>
        </div>
        {!generarPwd && (
          <input name="password" type="text" minLength={8} placeholder="Mínimo 8 caracteres"
            className="w-full border rounded-lg px-3 py-2 font-mono" />
        )}
        <p className="text-[11px] text-gray-500">
          El usuario deberá cambiarla en su primer inicio de sesión.
        </p>
      </div>

      {resultado && (
        <div className={`rounded-lg p-3 text-sm ${resultado.tipo === 'ok' ? 'bg-verde-claro/20 border border-verde text-verde-oscuro' : 'bg-rose-50 border border-rose-300 text-rose-800'}`}>
          {resultado.mensaje}
          {resultado.temporal && (
            <div className="mt-2 bg-white border border-amber-300 rounded p-2 text-amber-900">
              <div className="font-semibold mb-1">⚠️ Cópiala AHORA — solo se muestra una vez:</div>
              <code className="font-mono text-base bg-amber-50 px-3 py-2 rounded border border-amber-200 select-all block">{resultado.temporal}</code>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={pending}
          className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Creando…' : '➕ Crear usuario'}
        </button>
      </div>
    </form>
  );
}
