import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FloatingSocial } from '@/components/FloatingSocial';
import { Navbar } from '@/components/publico/Navbar';
import { ScrollProgress } from '@/components/publico/ScrollProgress';
import { CustomCursor } from '@/components/publico/CustomCursor';
import { LogoEPO } from '@/components/publico/LogoEPO';
import { PageBackdrop } from '@/components/publico/PageBackdrop';
import { GobiernoBanner } from '@/components/publico/GobiernoBanner';

export default async function PublicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [{ data: cfg }, { data: paginasMenu }] = await Promise.all([
    supabase
      .from('sitio_config')
      .select('nombre_escuela, cct, direccion, telefono, email, email2, horario, mapa_embed_url, facebook_url, instagram_url, tiktok_url, youtube_url, whatsapp_url, spotify_url, logo_url, lema')
      .maybeSingle(),
    supabase
      .from('paginas_publicas')
      .select('slug, titulo')
      .eq('publicada', true)
      .is('deleted_at', null)
      .order('orden')
      .limit(6),
  ]);

  const extras = (paginasMenu ?? []).map((p: any) => ({ href: `/publico/p/${p.slug}`, label: p.titulo }));

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-x-clip">
      <PageBackdrop />
      <ScrollProgress />
      <CustomCursor />
      <Navbar extras={extras} escuela={cfg?.nombre_escuela ?? 'EPO 221'} logoUrl={cfg?.logo_url} cct={cfg?.cct} />

      <main className="flex-1 pt-0">{children}</main>

      <FloatingSocial
        facebook={cfg?.facebook_url}
        instagram={cfg?.instagram_url}
        tiktok={cfg?.tiktok_url}
        spotify={cfg?.spotify_url}
        youtube={cfg?.youtube_url}
      />

      <footer className="relative bg-gradient-to-br from-[#0b3d3a] via-[#115e59] to-[#0d9488] text-white/85 pt-20 pb-10 mt-24 overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(94,234,212,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25), transparent 45%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <LogoEPO url={cfg?.logo_url} size={96} />
              <div>
                <div className="font-serif text-white text-2xl">{cfg?.nombre_escuela ?? 'EPO 221 "Nicolás Bravo"'}</div>
                <div className="text-xs opacity-75">CCT {cfg?.cct ?? '15EBH0409B'} · Bachillerato General Estatal</div>
                {cfg?.lema && <div className="text-xs italic text-verde-claro mt-1">"{cfg.lema}"</div>}
              </div>
            </div>
            <p className="text-sm max-w-md leading-relaxed opacity-80">
              Formación integral de nivel medio superior con la identidad y el humanismo del Estado de México.
            </p>
            <div className="mt-6 flex gap-3">
              {cfg?.facebook_url && (
                <a href={cfg.facebook_url} target="_blank" rel="noopener" aria-label="Facebook"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-verde transition flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" /></svg>
                </a>
              )}
              {cfg?.tiktok_url && (
                <a href={cfg.tiktok_url} target="_blank" rel="noopener" aria-label="TikTok"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-verde transition flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.6 8.3a6.4 6.4 0 0 1-3.7-1.2v7.2a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.05v2.8a2.7 2.7 0 1 0 2 2.6V2h2.8a3.7 3.7 0 0 0 3.7 3.3v3Z" /></svg>
                </a>
              )}
              {cfg?.instagram_url && (
                <a href={cfg.instagram_url} target="_blank" rel="noopener" aria-label="Instagram"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-verde transition flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM17.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" /></svg>
                </a>
              )}
              {cfg?.spotify_url && (
                <a href={cfg.spotify_url} target="_blank" rel="noopener noreferrer" aria-label="Spotify"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-verde transition flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.58 14.43a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.63.63 0 0 1-.28-1.22c3.82-.87 7.1-.5 9.73 1.11.3.18.39.57.2.86Zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.14-.56 11.23 1.33.37.23.48.71.26 1.07Zm.1-2.85c-3.22-1.91-8.54-2.09-11.61-1.16a.94.94 0 1 1-.55-1.8c3.52-1.07 9.39-.86 13.09 1.34a.94.94 0 1 1-.93 1.62Z" /></svg>
                </a>
              )}
              {cfg?.youtube_url && (
                <a href={cfg.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white hover:text-verde transition flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.75 15.5v-7l6.5 3.5-6.5 3.5Z" /></svg>
                </a>
              )}
            </div>
          </div>

          <div>
            <div className="text-verde-claro mb-3 font-semibold text-sm">Navegación</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/publico/oferta" className="hover:text-verde-claro">Oferta educativa</Link></li>
              <li><Link href="/publico/noticias" className="hover:text-verde-claro">Noticias</Link></li>
              <li><Link href="/publico/convocatorias" className="hover:text-verde-claro">Convocatorias</Link></li>
              <li><Link href="/publico/descargas" className="hover:text-verde-claro">Descargas</Link></li>
              <li><Link href="/publico/albumes" className="hover:text-verde-claro">Galería</Link></li>
              <li><Link href="/publico/contacto" className="hover:text-verde-claro">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-verde-claro mb-3 font-semibold text-sm">Contacto</div>
            <ul className="space-y-2 text-sm">
              {cfg?.direccion && <li>📍 {cfg.direccion}</li>}
              {cfg?.telefono  && <li>📞 {cfg.telefono}</li>}
              {cfg?.email     && <li>✉️ <a href={`mailto:${cfg.email}`} className="hover:text-verde-claro">{cfg.email}</a></li>}
              {cfg?.email2    && <li>📧 <a href={`mailto:${cfg.email2}`} className="hover:text-verde-claro">{cfg.email2}</a></li>}
              {cfg?.horario   && <li className="opacity-70 text-xs mt-1">🕐 {cfg.horario}</li>}
            </ul>
          </div>
        </div>

        {/* Franja institucional Gobierno del Estado de México · SEIEM */}
        <div className="relative max-w-7xl mx-auto px-6 mt-14 pt-8 border-t border-white/10">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-[10px] uppercase tracking-[0.4em] text-verde-claro/80">
              Institución oficial
            </div>
            <div className="bg-white/95 rounded-2xl px-6 py-3 shadow-xl shadow-black/20 border border-white/10">
              <GobiernoBanner height={56} />
            </div>
            <div className="text-[11px] text-white/60 max-w-xl">
              Gobierno del Estado de México · Secretaría de Educación, Ciencia, Tecnología e Innovación · SEIEM
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs opacity-60">
          <div>© {new Date().getFullYear()} {cfg?.nombre_escuela ?? 'EPO 221 "Nicolás Bravo"'} · Todos los derechos reservados</div>
          <div>Hecho con ♥ para la comunidad escolar del Estado de México</div>
        </div>
      </footer>
    </div>
  );
}
