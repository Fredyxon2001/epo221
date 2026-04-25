import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'EPO 221 "Nicolás Bravo" — Preparatoria Oficial',
  description: 'Sistema escolar de la Escuela Preparatoria Oficial No. 221',
  manifest: '/manifest.json',
  applicationName: 'EPO 221',
  appleWebApp: { capable: true, title: 'EPO 221', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#2a7a4b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-sans">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
