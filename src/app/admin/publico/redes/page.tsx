import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { guardarRedes } from './actions';

export default async function AdminRedes() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from('sitio_config')
    .select('facebook_url, instagram_url, tiktok_url, spotify_url, youtube_url, whatsapp_url')
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link href="/admin/publico" className="text-xs text-gray-500 hover:underline">
          ← Sitio público
        </Link>
        <h1 className="font-serif text-3xl text-verde mt-1">Redes sociales</h1>
        <p className="text-sm text-gray-500 mt-1">
          Los botones flotantes aparecen en el sitio público (abajo-derecha). Deja
          en blanco para ocultar una red.
        </p>
      </div>

      <form action={guardarRedes} className="bg-white rounded-lg shadow-sm p-5 space-y-4">
        <Field
          name="facebook_url"
          label="Facebook"
          icon="📘"
          placeholder="https://facebook.com/epo221"
          defaultValue={cfg?.facebook_url ?? ''}
        />
        <Field
          name="instagram_url"
          label="Instagram"
          icon="📷"
          placeholder="https://instagram.com/epo221"
          defaultValue={cfg?.instagram_url ?? ''}
        />
        <Field
          name="tiktok_url"
          label="TikTok"
          icon="🎵"
          placeholder="https://tiktok.com/@epo221"
          defaultValue={cfg?.tiktok_url ?? ''}
        />
        <Field
          name="spotify_url"
          label="Spotify"
          icon="🎧"
          placeholder="https://open.spotify.com/user/epo221"
          defaultValue={cfg?.spotify_url ?? ''}
        />
        <Field
          name="youtube_url"
          label="YouTube"
          icon="▶️"
          placeholder="https://youtube.com/@epo221"
          defaultValue={cfg?.youtube_url ?? ''}
        />
        <Field
          name="whatsapp_url"
          label="WhatsApp"
          icon="💬"
          placeholder="https://wa.me/5215555555555"
          defaultValue={cfg?.whatsapp_url ?? ''}
        />

        <div className="flex justify-end pt-2 border-t">
          <button
            type="submit"
            className="bg-verde text-white px-6 py-2 rounded hover:bg-verde-medio text-sm font-medium"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name, label, icon, placeholder, defaultValue,
}: { name: string; label: string; icon: string; placeholder: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-2">
        <span>{icon}</span> {label}
      </label>
      <input
        type="url"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full border rounded px-3 py-2 text-sm"
      />
    </div>
  );
}
