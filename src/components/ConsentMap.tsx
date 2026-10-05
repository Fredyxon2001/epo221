'use client';

import { useCookieConsent } from './CookieConsentProvider';
import { safeMapUrl } from '@/lib/cookie-consent';

export function ConsentMap({ src }: { src: string }) {
  const { external, openSettings } = useCookieConsent();
  const url = safeMapUrl(src);
  if (!url) return <div className="p-8 text-center text-sm">El mapa no está disponible. Consulta la dirección y los datos de contacto de la escuela.</div>;
  if (!external) return (
    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 p-8 text-center text-teal-900">
      <h3 className="text-xl font-semibold">Mapa de ubicación</h3>
      <p className="text-sm">Google puede usar cookies y recibir datos de tu conexión al cargar este mapa. Puedes autorizarlo en tus preferencias.</p>
      <button type="button" onClick={openSettings} className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold">Configurar cookies del mapa</button>
    </div>
  );
  return <iframe src={url} className="w-full aspect-[4/3] block border-0" loading="lazy" referrerPolicy="no-referrer" title="Ubicación de EPO 221" />;
}
