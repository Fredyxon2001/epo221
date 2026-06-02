'use client';
// Recortador de avatar circular con zoom + arrastre. Sin librerías (Canvas puro).
// Devuelve un Blob JPEG 400x400 listo para subir.
import { useEffect, useRef, useState, useCallback } from 'react';

const SIZE = 280; // tamaño del lienzo de edición (px)
const OUT = 400;  // resolución de salida

export function AvatarCropper({
  src,
  onCancel,
  onConfirm,
  saving = false,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  saving?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset del centro de la imagen
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const natural = useRef({ w: 0, h: 0 });

  // Cargar imagen y calcular zoom mínimo (para cubrir el círculo)
  useEffect(() => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      imgRef.current = im;
      natural.current = { w: im.naturalWidth, h: im.naturalHeight };
      const mz = SIZE / Math.min(im.naturalWidth, im.naturalHeight);
      setMinZoom(mz);
      setZoom(mz);
      setPos({ x: 0, y: 0 });
      setLoaded(true);
    };
    im.src = src;
  }, [src]);

  // Limita el offset para que la imagen siempre cubra el círculo
  const clamp = useCallback((p: { x: number; y: number }, z: number) => {
    const w = natural.current.w * z;
    const h = natural.current.h * z;
    const maxX = Math.max(0, (w - SIZE) / 2);
    const maxY = Math.max(0, (h - SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, p.x)),
      y: Math.max(-maxY, Math.min(maxY, p.y)),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = drag.current.px + (e.clientX - drag.current.x);
    const ny = drag.current.py + (e.clientY - drag.current.y);
    setPos(clamp({ x: nx, y: ny }, zoom));
  };
  const onPointerUp = () => { drag.current = null; };

  const changeZoom = (z: number) => {
    const nz = Math.max(minZoom, Math.min(minZoom * 4, z));
    setZoom(nz);
    setPos((p) => clamp(p, nz));
  };

  const recortar = () => {
    const im = imgRef.current;
    if (!im) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mapear lo visible (SIZE) -> salida (OUT)
    const scale = OUT / SIZE;
    ctx.save();
    // círculo de recorte
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const drawW = natural.current.w * zoom * scale;
    const drawH = natural.current.h * zoom * scale;
    const dx = (OUT - drawW) / 2 + pos.x * scale;
    const dy = (OUT - drawH) / 2 + pos.y * scale;
    ctx.drawImage(im, dx, dy, drawW, drawH);
    ctx.restore();
    canvas.toBlob((b) => { if (b) onConfirm(b); }, 'image/jpeg', 0.9);
  };

  // Render de preview en vivo
  const w = natural.current.w * zoom;
  const h = natural.current.h * zoom;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-xl text-verde-oscuro mb-1">Ajusta tu foto</h3>
        <p className="text-xs text-gray-500 mb-4">Arrastra para mover · usa el control para acercar.</p>

        {/* Área de recorte */}
        <div className="flex justify-center mb-4">
          <div
            className="relative rounded-full overflow-hidden border-4 border-verde/30 shadow-inner touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: SIZE, height: SIZE, background: '#f1f5f9' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {loaded && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt="recorte"
                draggable={false}
                style={{
                  position: 'absolute',
                  width: w, height: h,
                  left: SIZE / 2 - w / 2 + pos.x,
                  top: SIZE / 2 - h / 2 + pos.y,
                  maxWidth: 'none',
                }}
              />
            )}
            {!loaded && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>}
          </div>
        </div>

        {/* Control de zoom */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-lg">🔍</span>
          <input
            type="range"
            min={minZoom}
            max={minZoom * 4}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(parseFloat(e.target.value))}
            className="flex-1 accent-verde"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={recortar}
            disabled={!loaded || saving}
            className="flex-1 bg-verde hover:bg-verde-oscuro text-white font-semibold py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
