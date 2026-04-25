import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { guardarInicio, quitarHeroImagen, quitarLogo } from './actions';
import { ConfirmButton } from '@/components/ConfirmButton';

export default async function AdminInicio() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from('sitio_config')
    .select('hero_titulo, hero_subtitulo, hero_imagen_url, logo_url')
    .maybeSingle();

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/admin/publico" className="text-xs text-gray-500 hover:underline">← Sitio público</Link>
        <h1 className="font-serif text-3xl text-verde mt-1">Página de inicio</h1>
        <p className="text-sm text-gray-500 mt-1">Edita el hero principal de <code className="text-xs bg-gray-100 px-1 rounded">/publico</code>.</p>
      </div>

      <form action={guardarInicio} encType="multipart/form-data" className="bg-white rounded-lg shadow-sm p-5 space-y-5">
        {/* Logo institucional */}
        <fieldset className="border rounded-lg p-4 border-dorado/30 bg-dorado/5">
          <legend className="px-2 text-sm font-semibold text-verde">🛡️ Logo institucional</legend>
          <p className="text-xs text-gray-600 mb-3">
            Sube el escudo oficial de la EPO 221 en <strong>PNG con fondo transparente</strong> (recomendado 512×512 px, máx 5 MB).
            Aparecerá en el navbar, hero, footer, panel de administración y boletas.
          </p>
          {cfg?.logo_url && (
            <div className="mb-3 flex items-center gap-4">
              <div className="w-24 h-24 bg-verde rounded-xl flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cfg.logo_url} alt="Logo actual" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="text-xs">
                <div className="text-gray-600 mb-1">Vista previa sobre fondo verde institucional.</div>
                <form action={quitarLogo}>
                  <ConfirmButton message="¿Quitar el logo y volver al escudo dorado por defecto?" className="text-xs text-red-600 hover:underline">
                    Quitar logo
                  </ConfirmButton>
                </form>
              </div>
            </div>
          )}
          <input
            type="file"
            name="logo_imagen"
            accept="image/png,image/svg+xml,image/webp"
            className="w-full text-sm"
          />
        </fieldset>

        <div>
          <label className="text-xs font-medium text-gray-600">Título del hero</label>
          <input
            name="hero_titulo"
            defaultValue={cfg?.hero_titulo ?? ''}
            placeholder="Bachillerato con identidad"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">La última palabra se anima con un brillo dorado.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Subtítulo / descripción</label>
          <textarea
            name="hero_subtitulo"
            defaultValue={cfg?.hero_subtitulo ?? ''}
            placeholder="Preparatoria Oficial 221 'Nicolás Bravo'..."
            rows={4}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Imagen de fondo del hero (opcional, JPG/PNG/WEBP máx 5 MB)</label>
          {cfg?.hero_imagen_url && (
            <div className="mt-2 mb-2 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cfg.hero_imagen_url} alt="Hero actual" className="w-40 h-24 object-cover rounded border" />
            </div>
          )}
          <input
            type="file"
            name="hero_imagen"
            accept="image/*"
            className="mt-1 w-full text-sm"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          {cfg?.hero_imagen_url ? (
            <form action={quitarHeroImagen}>
              <ConfirmButton message="¿Quitar la imagen del hero?" className="text-xs text-red-600 hover:underline">
                Quitar imagen del hero
              </ConfirmButton>
            </form>
          ) : <span />}
          <button type="submit" className="bg-verde text-white px-6 py-2 rounded hover:bg-verde-medio text-sm font-medium">
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
