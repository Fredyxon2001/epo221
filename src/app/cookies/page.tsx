import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Política de cookies | EPO 221' };

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 pb-44 text-slate-800">
      <Link href="/publico" className="text-teal-800 underline">Volver al sitio escolar</Link>
      <h1 className="mt-8 text-3xl font-bold text-teal-900">Política de cookies</h1>
      <p className="mt-3 text-sm">Actualizada el 6 de octubre de 2026. Aplica al sitio público y al sistema privado de EPO 221 «Nicolás Bravo».</p>
      <h2 className="mt-8 text-xl font-semibold">Cookies necesarias</h2>
      <p className="mt-3">Las cookies de Supabase, cuyo nombre comienza con sb- y puede incluir fragmentos numerados, mantienen y renuevan tu sesión al acceder al sistema escolar. No se usan como autorización para publicidad. Su duración en el navegador puede alcanzar 400 días; la validez real de la sesión depende de Supabase y del cierre de sesión.</p>
      <p className="mt-3">La cookie epo221-cookie-consent guarda únicamente tu decisión sobre el mapa, la versión de esta política y la fecha de elección durante 180 días. No contiene tu nombre ni tu expediente. Puedes bloquear las cookies desde tu navegador, pero el inicio de sesión y la persistencia de tu elección pueden dejar de funcionar.</p>
      <h2 className="mt-8 text-xl font-semibold">Servicios opcionales de terceros</h2>
      <p className="mt-3">El mapa incrustado de Google permanece bloqueado hasta que aceptas las cookies opcionales o activas esa opción en «Preferencias de cookies». Al cargarlo, Google recibe datos de conexión y puede utilizar sus propias cookies, con nombres y duraciones definidos por ese proveedor.</p>
      <p className="mt-3"><a href="https://policies.google.com/technologies/cookies?hl=es" target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">Consulta la información de cookies de Google</a>.</p>
      <h2 className="mt-8 text-xl font-semibold">Cambiar o retirar tu decisión</h2>
      <p className="mt-3">El botón «Preferencias de cookies» está disponible en todas las páginas. Rechazar las opcionales retira el mapa de la página y evita nuevas cargas. Las cookies que Google haya guardado en su propio dominio se eliminan desde tu navegador. Al vencer tu elección, o si cambia la versión de la política, volveremos a solicitarla.</p>
      <h2 className="mt-8 text-xl font-semibold">Otros recursos y almacenamiento</h2>
      <p className="mt-3">El tema de color y la disposición del menú se recuerdan en el almacenamiento local del navegador. La aplicación instalable utiliza caché de recursos estáticos y excluye páginas y respuestas privadas. Las fuentes y el QR de la aplicación móvil se sirven desde esta aplicación. Los enlaces a redes sociales abren sitios con sus propias políticas. No se han incorporado herramientas de publicidad ni analítica en esta implementación.</p>
      <p className="mt-3">Al elegir «Descargar app Android», el navegador abre GitHub para obtener el instalador. Ese proveedor recibe la conexión de descarga y aplica su <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">política de privacidad</a>. Esta página no carga recursos de GitHub automáticamente.</p>
      <h2 className="mt-8 text-xl font-semibold">Consultas</h2>
      <p className="mt-3">Para consultas sobre el uso de cookies, utiliza los <Link href="/publico/contacto" className="text-teal-800 underline">datos oficiales de contacto de la escuela</Link>. Consulta también la <Link href="/privacidad" className="text-teal-800 underline">información sobre privacidad y datos escolares</Link>.</p>
    </main>
  );
}
