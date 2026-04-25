// Render de adjunto dentro de un mensaje. Recibe signedUrl ya generado.
export function Adjunto({
  signedUrl,
  nombre,
  tipo,
  tamano,
  esMio,
}: {
  signedUrl: string;
  nombre: string;
  tipo: string;
  tamano?: number | null;
  esMio: boolean;
}) {
  const esImagen = tipo?.startsWith('image/');
  const esVideo = tipo?.startsWith('video/');
  const esAudio = tipo?.startsWith('audio/');
  const esPdf = tipo === 'application/pdf';
  const kb = tamano ? (tamano / 1024).toFixed(0) + ' KB' : '';

  if (esImagen) {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <img src={signedUrl} alt={nombre} className="max-h-64 rounded-lg object-cover" />
      </a>
    );
  }
  if (esVideo) {
    return <video src={signedUrl} controls className="max-h-64 rounded-lg mt-1" />;
  }
  if (esAudio) {
    return <audio src={signedUrl} controls className="w-full mt-1" />;
  }

  const icon = esPdf ? '📄' : '📎';
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 mt-1 px-3 py-2 rounded-lg text-xs ${
        esMio ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <div className="font-semibold truncate max-w-[200px]">{nombre}</div>
        {kb && <div className="opacity-70">{kb}</div>}
      </div>
    </a>
  );
}
