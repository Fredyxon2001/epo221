'use client';

import { Suspense, useState, useTransition } from 'react';
import { loginAction } from './actions';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { LogoEPO } from '@/components/publico/LogoEPO';
import { GobiernoBanner } from '@/components/publico/GobiernoBanner';

export function LoginForm({ logoUrl, lema, cct, nombreEscuela }: {
  logoUrl?: string | null;
  lema?: string | null;
  cct?: string | null;
  nombreEscuela?: string | null;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-crema" />}>
      <LoginInner logoUrl={logoUrl} lema={lema} cct={cct} nombreEscuela={nombreEscuela} />
    </Suspense>
  );
}

function LoginInner({ logoUrl, lema, cct, nombreEscuela }: {
  logoUrl?: string | null;
  lema?: string | null;
  cct?: string | null;
  nombreEscuela?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<'alumno' | 'staff'>('alumno');
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '';

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-crema">
      {/* ============= PANEL IZQUIERDO (institucional con logos) ============= */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-animated-verde text-white p-10 xl:p-14">
        <div className="aurora absolute inset-0 opacity-80" aria-hidden />
        <div className="grain absolute inset-0" aria-hidden />
        <div className="absolute -left-32 -top-32 w-[500px] h-[500px] bg-white/10 blob blur-3xl" aria-hidden />
        <div className="absolute -right-24 bottom-1/4 w-[360px] h-[360px] bg-verde-claro/30 blob blur-3xl" aria-hidden style={{ animationDelay: '-6s' }} />

        {/* Partículas */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: `${(i * 73) % 100}%`,
                width: 4 + ((i * 3) % 5),
                height: 4 + ((i * 3) % 5),
                animationDuration: `${14 + (i % 6) * 2}s`,
                animationDelay: `${(i * 1.4) % 10}s`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>

        {/* ───── Header: banner Gobierno + EPO ───── */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="bg-white/95 rounded-xl px-4 py-2.5 shadow-xl shadow-black/30 inline-flex"
          >
            <GobiernoBanner height={40} />
          </motion.div>

          <Link href="/publico" className="inline-flex items-center gap-4 group">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 1, ease: [0.2, 0.85, 0.2, 1.3] }}
              className="drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              <LogoEPO url={logoUrl} size={80} glow />
            </motion.div>
            <div>
              <div className="font-serif text-2xl leading-tight">{nombreEscuela ?? 'EPO 221'}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-[0.3em] mt-0.5">Nicolás Bravo</div>
              <div className="text-[10px] text-verde-claro/90 uppercase tracking-[0.25em] mt-0.5">CCT {cct ?? '15EBH0409B'}</div>
            </div>
          </Link>
        </div>

        {/* ───── Cuerpo: frase hero ───── */}
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-xs uppercase tracking-[0.5em] text-verde-claro mb-5"
          >
            Portal institucional
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="font-serif text-4xl xl:text-5xl leading-[1.08]"
          >
            Bienvenido a{' '}
            <span className="text-shimmer">tu escuela</span>.
          </motion.h1>
          {lema && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="font-serif italic text-verde-claro/90 text-base mt-4"
            >
              &ldquo;{lema}&rdquo;
            </motion.div>
          )}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-5 text-white/80 text-sm leading-relaxed"
          >
            Alumnos, docentes, dirección y administración acceden aquí al mismo sistema.
            Calificaciones, boletas, anuncios y gestión — todo en un solo lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.65 }}
            className="mt-8 grid grid-cols-4 gap-2 text-xs"
          >
            {[
              { k: '🎓', l: 'Alumnos' },
              { k: '📚', l: 'Docentes' },
              { k: '🏛️', l: 'Dirección' },
              { k: '⚙️', l: 'Admin' },
            ].map((x) => (
              <motion.div
                key={x.l}
                whileHover={{ y: -4, scale: 1.05 }}
                className="glass rounded-xl px-2 py-3 text-center cursor-default"
              >
                <div className="text-xl mb-1">{x.k}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/80">{x.l}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/60">
          <div>SEIEM · Gobierno del Estado de México</div>
          <Link href="/publico" className="hover:text-white transition">← Volver al sitio</Link>
        </div>
      </aside>

      {/* ============= PANEL DERECHO (formulario) ============= */}
      <section className="flex flex-col items-center justify-center p-6 md:p-12 relative min-h-screen">
        {/* Header mobile con logos */}
        <div className="lg:hidden w-full max-w-md mb-6 flex flex-col items-center gap-4">
          <div className="bg-white/90 rounded-lg px-3 py-2 border border-gray-200">
            <GobiernoBanner height={32} />
          </div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.2, 0.85, 0.2, 1.3] }}
            className="flex items-center gap-3"
          >
            <LogoEPO url={logoUrl} size={60} />
            <div>
              <div className="font-serif text-verde-oscuro text-lg leading-tight">{nombreEscuela ?? 'EPO 221'}</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-verde/70">Nicolás Bravo · CCT {cct ?? '15EBH0409B'}</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.4em] text-verde font-semibold mb-2">Iniciar sesión</div>
            <h2 className="font-serif text-3xl md:text-4xl text-verde-oscuro">Accede a tu cuenta</h2>
            <p className="text-sm text-gray-500 mt-2">
              Selecciona tu rol para ver las indicaciones correctas.
            </p>
          </div>

          {/* Segmented control de rol */}
          <div className="relative mb-6 p-1 bg-white rounded-2xl border border-gray-200 flex shadow-sm">
            {(['alumno', 'staff'] as const).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-gray-500 hover:text-verde-oscuro'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="role-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-verde-oscuro via-verde to-verde-medio shadow-md"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-2">
                    {r === 'alumno' ? '🎓 Soy alumno' : '🧑‍🏫 Personal'}
                  </span>
                </button>
              );
            })}
          </div>

          <form
            action={(fd) => {
              setError(null);
              fd.set('redirect', redirect);
              startTransition(async () => {
                const res = await loginAction(fd);
                if (res?.error) setError(res.error);
              });
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="curp" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                {role === 'alumno' ? 'CURP' : 'Correo institucional'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-verde/70 text-base pointer-events-none">
                  {role === 'alumno' ? '🪪' : '✉️'}
                </span>
                <input
                  id="curp"
                  name="curp"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder={role === 'alumno' ? 'AAAA000000HDFXXX00' : 'docente@epo221.edu.mx'}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-3 py-3 tracking-wider font-mono text-sm text-verde-oscuro placeholder:text-gray-400 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none transition"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                {role === 'alumno'
                  ? 'Tu CURP va en mayúsculas. Si no la tienes, solicítala en Control Escolar.'
                  : 'Usa tu correo institucional asignado. Profesores, admin y dirección entran aquí.'}
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-verde/70 pointer-events-none">🔐</span>
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder={role === 'alumno' ? 'Tu matrícula (primer ingreso)' : 'Tu contraseña'}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-sm text-verde-oscuro placeholder:text-gray-400 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-gray-400 hover:text-verde hover:bg-crema transition flex items-center justify-center"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {role === 'alumno' && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Primer ingreso: usa tu <strong>matrícula</strong> como contraseña. Te pediremos cambiarla.
                </p>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3 flex items-start gap-2"
                >
                  <span className="text-lg leading-none">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={pending}
              className="btn-ripple relative w-full bg-gradient-to-r from-verde-oscuro via-verde to-verde-medio hover:from-verde hover:via-verde-medio hover:to-verde-claro text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-verde/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Verificando…
                </>
              ) : (
                <>
                  Entrar
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/recuperar" className="text-xs text-verde font-semibold hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
            <div>¿Problemas para acceder? Acude a <span className="font-semibold text-verde-oscuro">Control Escolar</span>.</div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link href="/publico" className="hover:text-verde transition">← Sitio público</Link>
              <span className="text-gray-300">|</span>
              <Link href="/publico/contacto" className="hover:text-verde transition">Contacto</Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
