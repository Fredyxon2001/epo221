// Server component: envuelve cada área privada con sidebar + fondo.
// Se espera que cada page interna renderice su propio <Topbar /> para
// controlar título/breadcrumbs — así el server puede hacer la consulta
// contextual de notificaciones y título sin prop drilling.
import { ReactNode } from 'react';
import { PrivateSidebar, NavGroup } from './PrivateSidebar';

type Role = 'alumno' | 'profesor' | 'admin' | 'director' | 'staff';

// Tonos base por rol: armonizan con el gradiente del sidebar pero en claro,
// así el panel derecho no se ve blanco plano.
const bgByRole: Record<Role, string> = {
  alumno:   'from-[#e6f7f1] via-[#f0fbf6] to-[#dff3ec]',
  profesor: 'from-[#e4f1ef] via-[#eefaf6] to-[#d9ede6]',
  admin:    'from-[#dfeae7] via-[#eaf4ef] to-[#d1e4df]',
  staff:    'from-[#dfeae7] via-[#eaf4ef] to-[#d1e4df]',
  director: 'from-[#f5ecd6] via-[#f6f0de] to-[#eadfc0]',
};

// Blobs superiores/inferiores con colores que cuajan con el sidebar
const blobTones: Record<Role, { a: string; b: string; c: string }> = {
  alumno:   { a: 'bg-verde/20', b: 'bg-dorado/15', c: 'bg-verde-claro/25' },
  profesor: { a: 'bg-verde-oscuro/20', b: 'bg-dorado/20', c: 'bg-verde-claro/20' },
  admin:    { a: 'bg-verde-oscuro/20', b: 'bg-verde/20', c: 'bg-dorado/15' },
  staff:    { a: 'bg-verde-oscuro/20', b: 'bg-verde/20', c: 'bg-dorado/15' },
  director: { a: 'bg-dorado/25', b: 'bg-verde-oscuro/15', c: 'bg-dorado/15' },
};

export function PrivateShell({
  role,
  groups,
  userName,
  userSub,
  logoUrl,
  children,
}: {
  role: Role;
  groups: NavGroup[];
  userName: string;
  userSub?: string;
  logoUrl?: string | null;
  children: ReactNode;
}) {
  const bg = bgByRole[role];
  const blob = blobTones[role];

  return (
    <div className={`min-h-screen text-verde-oscuro flex bg-gradient-to-br ${bg}`}>
      <PrivateSidebar role={role} groups={groups} userName={userName} userSub={userSub} logoUrl={logoUrl} />

      <div className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
        {/* ───── Capa decorativa animada (aurora + blobs + grid sutil + logo watermark) ───── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {/* Aurora suave */}
          <div className="aurora absolute inset-0 opacity-40" />

          {/* Blobs flotantes con morph */}
          <div
            className={`absolute -top-40 -right-24 w-[520px] h-[520px] rounded-full ${blob.a} blur-3xl blob`}
          />
          <div
            className={`absolute top-1/3 -left-24 w-[380px] h-[380px] rounded-full ${blob.b} blur-3xl blob`}
            style={{ animationDelay: '-6s' }}
          />
          <div
            className={`absolute -bottom-32 right-1/4 w-[460px] h-[460px] rounded-full ${blob.c} blur-3xl blob`}
            style={{ animationDelay: '-11s' }}
          />

          {/* Grid de puntos muy tenue */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(rgba(11,52,51,1) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          {/* Watermark grande del logo institucional — centrado-derecha, bien visible pero transparente */}
          {logoUrl ? (
            <>
              <div
                className="absolute top-1/2 -right-24 -translate-y-1/2 w-[680px] h-[680px] opacity-[0.11] hidden lg:block animate-[floatY_14s_ease-in-out_infinite]"
                style={{
                  backgroundImage: `url(${logoUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                }}
              />
              {/* Versión mobile, más pequeña en esquina */}
              <div
                className="absolute -bottom-8 -right-8 w-[320px] h-[320px] opacity-[0.09] lg:hidden"
                style={{
                  backgroundImage: `url(${logoUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                }}
              />
            </>
          ) : (
            <div className="absolute top-1/2 -right-8 -translate-y-1/2 font-serif text-[360px] leading-none text-verde-oscuro/[0.06] select-none hidden lg:block">
              221
            </div>
          )}
        </div>

        {/* Contenido real encima */}
        <div className="relative z-10 flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
