'use client';
import { useState, useTransition, useRef } from 'react';
import { actualizarMiPerfil, subirMiAvatar, eliminarMiAvatar } from '@/app/perfil/actions';

export type PerfilData = {
  nombre: string;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  email: string;
  telefono?: string | null;
  cargo?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  rfc?: string | null; // solo profesores
  rol: string;
};

export function PerfilEditor({ data, esProfesor = false }: { data: PerfilData; esProfesor?: boolean }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(data.avatar_url ?? null);
  const [uploadingAvatar, startAvatarUpload] = useTransition();
  const [savingPerfil, startGuardarPerfil] = useTransition();
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const iniciales = `${data.nombre?.[0] ?? ''}${data.apellido_paterno?.[0] ?? ''}`.toUpperCase();

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErrMsg(null); setOkMsg(null);
    const fd = new FormData(); fd.set('avatar', f);
    startAvatarUpload(async () => {
      const r = await subirMiAvatar(fd);
      if (r?.error) setErrMsg(r.error);
      else { setAvatarUrl(r?.url ?? null); setOkMsg('✅ Foto actualizada'); }
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  const onRemoveAvatar = () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return;
    setErrMsg(null); setOkMsg(null);
    startAvatarUpload(async () => {
      const r = await eliminarMiAvatar();
      if (r?.error) setErrMsg(r.error);
      else { setAvatarUrl(null); setOkMsg('✅ Foto eliminada'); }
    });
  };

  const onSubmitDatos = (fd: FormData) => {
    setErrMsg(null); setOkMsg(null);
    startGuardarPerfil(async () => {
      const r = await actualizarMiPerfil(fd);
      if (r?.error) setErrMsg(r.error);
      else setOkMsg('✅ Datos actualizados');
    });
  };

  const pending = uploadingAvatar || savingPerfil;

  return (
    <div className="space-y-6">
      {/* AVATAR */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-verde-oscuro mb-3">📷 Foto de perfil</h3>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-verde-claro/30" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-verde to-verde-medio text-white flex items-center justify-center text-3xl font-bold ring-4 ring-verde-claro/30">
                {iniciales || '?'}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs">
                Subiendo…
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm flex-1 min-w-[200px]">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending}
                onClick={() => fileRef.current?.click()}
                className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 text-xs">
                📤 {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {avatarUrl && (
                <button type="button" disabled={pending}
                  onClick={onRemoveAvatar}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold px-4 py-2 rounded-lg disabled:opacity-50 text-xs">
                  🗑 Eliminar
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              JPG, PNG o WEBP. Máximo 3 MB. Cuadrada (1:1) se ve mejor.
            </p>
          </div>
        </div>
      </div>

      {/* DATOS */}
      <form action={onSubmitDatos} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-verde-oscuro">📋 Mis datos</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-600 font-semibold">Nombre(s) *</span>
            <input name="nombre" defaultValue={data.nombre} required
              className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600 font-semibold">Apellido paterno</span>
            <input name="apellido_paterno" defaultValue={data.apellido_paterno ?? ''}
              className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600 font-semibold">Apellido materno</span>
            <input name="apellido_materno" defaultValue={data.apellido_materno ?? ''}
              className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-600 font-semibold">Correo (no editable)</span>
            <input value={data.email} disabled
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 font-mono text-xs cursor-not-allowed" />
            <span className="text-[10px] text-gray-500">Para cambiar tu correo institucional contacta al administrador.</span>
          </label>
          <label className="block">
            <span className="text-xs text-gray-600 font-semibold">Teléfono</span>
            <input name="telefono" type="tel" defaultValue={data.telefono ?? ''}
              placeholder="55 1234 5678" className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
        </div>

        {esProfesor && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-xs text-gray-600 font-semibold">RFC (para constancia de servicio)</span>
              <input name="rfc" defaultValue={data.rfc ?? ''} maxLength={13}
                placeholder="XAXX010101000" className="mt-1 w-full border rounded-lg px-3 py-2 font-mono uppercase" />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-600 font-semibold">Cargo / Puesto (opcional)</span>
            <input name="cargo" defaultValue={data.cargo ?? ''}
              placeholder="Ej. Director Académico, Profesor de Matemáticas…"
              className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <div></div>
        </div>

        <label className="block text-sm">
          <span className="text-xs text-gray-600 font-semibold">Biografía corta (opcional)</span>
          <textarea name="bio" defaultValue={data.bio ?? ''} rows={3}
            placeholder="Una breve descripción profesional que aparecerá en tu perfil público interno."
            className="mt-1 w-full border rounded-lg px-3 py-2 resize-none" />
        </label>

        {okMsg && <div className="bg-verde-claro/20 border border-verde rounded p-2 text-xs text-verde-oscuro">{okMsg}</div>}
        {errMsg && <div className="bg-rose-50 border border-rose-300 rounded p-2 text-xs text-rose-700">⚠️ {errMsg}</div>}

        <div className="flex justify-end">
          <button type="submit" disabled={pending}
            className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50 text-sm">
            {savingPerfil ? 'Guardando…' : '💾 Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
