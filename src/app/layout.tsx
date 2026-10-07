import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';
import { CookieConsentProvider } from '@/components/CookieConsentProvider';
import { UploadNotice } from '@/components/UploadNotice';
import { cookies, headers } from 'next/headers';
import { CONSENT_COOKIE, parseConsent } from '@/lib/cookie-consent';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-300.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-900.css';

export const metadata: Metadata = {
  title: 'EPO 221 "Nicolás Bravo" — Preparatoria Oficial',
  description: 'Sistema escolar de la Escuela Preparatoria Oficial No. 221',
  manifest: '/manifest.json',
  applicationName: 'EPO 221',
  icons: {
    icon: { url: '/img/logo-epo221.png', type: 'image/png', sizes: '512x512' },
    apple: '/img/logo-epo221.png',
  },
  appleWebApp: { capable: true, title: 'EPO 221', statusBarStyle: 'default' },
  verification: {
    google: 'fYptKllgGmJ32LgtSykXN_tzSMxuyFj2LDxAGIef51o',
  },
};

export const viewport: Viewport = {
  themeColor: '#2a7a4b',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request rendering keeps script nonces out of shared HTML caches.
  await headers();
  const initialConsent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  return (
    <html lang="es">
      <body className="font-sans">
        <PWARegister />
        <UploadNotice />
        <CookieConsentProvider initialConsent={initialConsent}>{children}</CookieConsentProvider>
      </body>
    </html>
  );
}
