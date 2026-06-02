'use client';
import { useRef, useState, useTransition } from 'react';
import { subirAvatar } from '@/app/perfil/avatar-actions';
import { AvatarCropper } from './AvatarCropper';

export function AvatarUploader({
  fotoActual,
  iniciales,
}: {
  fotoActual?: string | null;
  iniciales: string;
}) {
  const [preview, setPreview] = useState<string | null>(fotoActual ?? null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(f: File) {
    setErr(null); setOk(false);
    if (f.size > 8 * 1024 * 1024) { setErr('Imagen mayor a 8 MB'); return; }
    setCropSrc(URL.createObjectURL(f)); // abrir recortador
  }

  function onConfirmCrop(blob: Blob) {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    setPreview(URL.createObjectURL(blob));
    const fd = new FormData();
    fd.set('avatar', file);
    start(async () => {
      const res = await subirAvatar(fd);
      if (res?.error) { setErr(res.error); setPreview(fotoActual ?? null); }
      else { setOk(true); if (res?.url) setPreview(res.url); }
      setCropSrc(null);
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
            📷 {fotoActual || preview ? 'Cambiar foto' : 'Subir foto'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
          />
          <p className="text-xs text-gray-500 mt-2">Podrás recortar y ajustar antes de guardar. JPG/PNG/WebP.</p>
          {err && <p className="text-xs text-rose-600 mt-1">⚠️ {err}</p>}
          {ok && <p className="text-xs text-verde mt-1">✅ Foto actualizada.</p>}
        </div>
      </div>

      {cropSrc && (
        <AvatarCropper
          src={cropSrc}
          saving={pending}
          onCancel={() => setCropSrc(null)}
          onConfirm={onConfirmCrop}
        />
      )}
    </div>
  );
}
