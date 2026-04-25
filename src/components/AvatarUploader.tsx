'use client';
import { useRef, useState, useTransition } from 'react';
import { subirAvatar } from '@/app/perfil/avatar-actions';

export function AvatarUploader({
  fotoActual,
  iniciales,
}: {
  fotoActual?: string | null;
  iniciales: string;
}) {
  const [preview, setPreview] = useState<string | null>(fotoActual ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onSelect(f: File) {
    setErr(null); setOk(false);
    setPreview(URL.createObjectURL(f));
    const fd = new FormData();
    fd.set('avatar', f);
    start(async () => {
      const res = await subirAvatar(fd);
      if (res?.error) { setErr(res.error); setPreview(fotoActual ?? null); }
      else { setOk(true); if (res?.url) setPreview(res.url); }
    });
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <h2 className="text-sm uppercase text-gray-500 mb-3">Foto de perfil</h2>
      <div className="flex items-center gap-5">
        <div className="relative">
          {preview ? (
            <img src={preview} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-verde/20 shadow" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-verde to-verde-medio text-white flex items-center justify-center text-3xl font-bold shadow">
              {iniciales}
            </div>
          )}
          {pending && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs">
              Subiendo…
            </div>
          )}
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="bg-verde hover:bg-verde-oscuro text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            📷 {fotoActual ? 'Cambiar foto' : 'Subir foto'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}
          />
          <p className="text-xs text-gray-500 mt-2">Formatos: JPG/PNG. Máx. 2 MB.</p>
          {err && <p className="text-xs text-rose-600 mt-1">⚠️ {err}</p>}
          {ok && <p className="text-xs text-verde mt-1">✅ Foto actualizada.</p>}
        </div>
      </div>
    </div>
  );
}
