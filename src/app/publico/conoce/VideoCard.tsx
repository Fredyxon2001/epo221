'use client';
import { useState, useRef } from 'react';

type Video = {
  slug: string;
  titulo: string;
  descripcion: string;
  duracion: string;
};

export function VideoCard({ video, variant }: { video: Video; variant: 'destacado' | 'estandar' }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const src = `/videos/${video.slug}.mp4`;
  const poster = `/videos/${video.slug}.jpg`;

  const togglePlay = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  const isDestacado = variant === 'destacado';

  return (
    <div className={`group relative overflow-hidden rounded-2xl shadow-xl ${isDestacado ? 'bg-verde-oscuro' : 'bg-white border border-verde/15'}`}>
      <div className="relative aspect-video bg-verde-oscuro overflow-hidden">
        <video
          ref={ref}
          src={src}
          poster={poster}
          preload="none"
          playsInline
          controls={playing}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          className="w-full h-full object-cover"
        />
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/30 to-black/10 hover:from-black/90 hover:via-black/40 transition cursor-pointer group"
            aria-label={`Reproducir ${video.titulo}`}
          >
            <div className="w-20 h-20 rounded-full bg-dorado/95 group-hover:bg-dorado-claro flex items-center justify-center shadow-2xl shadow-black/50 group-hover:scale-110 transition">
              <span className="text-4xl text-verde-oscuro ml-2">▶</span>
            </div>
            <span className="absolute top-3 right-3 bg-black/70 text-white text-[11px] font-mono px-2 py-1 rounded">
              {video.duracion}
            </span>
            <span className="absolute bottom-3 left-3 bg-dorado/90 text-verde-oscuro text-[10px] font-bold uppercase px-2 py-1 rounded">
              ✈️ Dron DJI
            </span>
          </button>
        )}
      </div>

      <div className={`p-4 ${isDestacado ? 'text-white' : ''}`}>
        <h3 className={`font-serif ${isDestacado ? 'text-2xl text-white' : 'text-lg text-verde-oscuro'} font-bold leading-snug mb-1`}>
          {video.titulo}
        </h3>
        <p className={`text-sm leading-relaxed ${isDestacado ? 'text-white/85' : 'text-gray-600'}`}>
          {video.descripcion}
        </p>
      </div>
    </div>
  );
}
