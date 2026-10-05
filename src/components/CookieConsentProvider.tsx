'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CONSENT_COOKIE, CONSENT_MAX_AGE, CONSENT_VERSION, parseConsent, type CookieConsent } from '@/lib/cookie-consent';

const ConsentContext = createContext({ external: false, openSettings: () => {} });
export const useCookieConsent = () => useContext(ConsentContext);

function readConsent() {
  try {
    return parseConsent(document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1));
  } catch { return null; }
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const [external, setExternal] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => {
      const saved = readConsent();
      setConsent(saved);
      setReady(true);
    };
    sync();
    window.addEventListener('focus', sync);
    const timer = window.setInterval(sync, 60_000);
    return () => { window.removeEventListener('focus', sync); window.clearInterval(timer); };
  }, []);

  useEffect(() => { if (settings) heading.current?.focus(); }, [settings]);

  const openSettings = () => {
    setExternal(consent?.external ?? false);
    setSettings(true);
  };
  const save = (allowExternal: boolean) => {
    const next = { version: CONSENT_VERSION, external: allowExternal, savedAt: Date.now() };
    try {
      document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    } catch { /* Algunos navegadores bloquean el acceso al almacenamiento. */ }
    const stored = readConsent();
    setConsent(stored);
    setStorageError(!stored);
    setSettings(false);
    trigger.current?.focus();
  };

  const visible = ready && (!consent || settings);
  const buttonClass = 'rounded-lg border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700';

  return (
    <ConsentContext.Provider value={{ external: consent?.external ?? false, openSettings }}>
      {children}
      <button ref={trigger} type="button" onClick={openSettings}
        className="fixed bottom-3 left-3 z-[80] rounded-full bg-white px-4 py-2 text-xs font-semibold text-teal-900 shadow-lg border border-teal-200">
        Preferencias de cookies
      </button>
      {visible && (
        <section aria-labelledby="cookie-heading" aria-label="Preferencias de cookies"
          className="fixed bottom-0 inset-x-0 z-[90] max-h-[85dvh] overflow-y-auto border-t border-teal-200 bg-white p-5 text-slate-800 shadow-2xl sm:p-6">
          <div className="mx-auto max-w-5xl space-y-3">
            <h2 ref={heading} tabIndex={-1} id="cookie-heading" className="text-lg font-bold text-teal-900">Tú decides sobre las cookies</h2>
            <p className="text-sm">Usamos cookies necesarias para iniciar sesión y recordar tu elección. El mapa de Google es opcional y solo se carga si lo autorizas. Rechazarlo no impide navegar ni acceder al sistema escolar.</p>
            <Link href="/cookies" className="inline-block text-sm text-teal-800 underline">Leer política de cookies</Link>
            {settings && (
              <div className="space-y-2 text-sm">
                <p>Cookies necesarias: siempre activas (sesión y elección de cookies).</p>
                <label className="flex items-center gap-3"><input type="checkbox" checked={external} onChange={(event) => setExternal(event.target.checked)} /> Permitir el mapa de Google y sus cookies de terceros</label>
              </div>
            )}
            {storageError && <p role="status" className="text-sm text-red-700">El navegador no pudo guardar tu elección. Los servicios opcionales siguen bloqueados. Revisa si permites cookies de este sitio.</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" className={buttonClass} onClick={() => save(false)}>Rechazar opcionales</button>
              <button type="button" className={buttonClass} onClick={() => save(true)}>Aceptar opcionales</button>
              {settings ? <button type="button" className={buttonClass} onClick={() => save(external)}>Guardar preferencias</button>
                : <button type="button" className={buttonClass} onClick={openSettings}>Configurar</button>}
              {settings && consent && <button type="button" className={buttonClass} onClick={() => { setSettings(false); trigger.current?.focus(); }}>Cerrar</button>}
            </div>
          </div>
        </section>
      )}
    </ConsentContext.Provider>
  );
}
