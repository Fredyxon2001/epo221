import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacidad y datos escolares | EPO 221' };

export default function PrivacyPage() {
  const approved = process.env.PRIVACY_NOTICE_URL;
  const official = approved && (() => { try { return new URL(approved).protocol === 'https:' ? approved : null; } catch { return null; } })();
  return <main className="mx-auto max-w-3xl px-6 py-16 pb-44 text-slate-800">
    <Link href="/publico" className="text-verde underline">Volver al sitio escolar</Link>
    <h1 className="mt-8 text-3xl font-bold text-verde-oscuro">Privacidad y datos escolares</h1>
    <p className="mt-3">EPO 221 «Nicolás Bravo» utiliza este sistema para la gestión escolar. Esta página explica las funciones del sistema y facilita el acceso a la información institucional sobre datos personales.</p>
    <h2 className="mt-8 text-xl font-semibold">Aviso institucional</h2>
    {official ? <p className="mt-3"><a href={official} target="_blank" rel="noopener noreferrer" className="text-verde underline">Consultar el aviso de privacidad institucional aprobado</a>.</p> : <p className="mt-3">El aviso integral aprobado y el contacto oficial de la Unidad de Transparencia están pendientes de publicación en este sitio. Solicítalos a la escuela mediante los <Link href="/publico/contacto" className="text-verde underline">canales institucionales de contacto</Link>. Esta página informativa no reemplaza ese aviso.</p>}
    <h2 className="mt-8 text-xl font-semibold">Información utilizada en el sistema</h2>
    <p className="mt-3">Según las funciones habilitadas, se registran datos de identificación y contacto, matrícula y CURP, expediente académico, asistencia, calificaciones, pagos y comprobantes, tutorías, reportes de conducta, documentos y mensajes escolares. Algunos registros pueden contener datos de menores de edad o información sensible, por lo que requieren medidas específicas y revisión institucional.</p>
    <h2 className="mt-8 text-xl font-semibold">Finalidades de las funciones escolares</h2>
    <p className="mt-3">El sistema permite administrar inscripciones, dar seguimiento académico, comunicar avisos, gestionar pagos, emitir documentos y atender solicitudes de alumnos y tutores. La institución debe precisar las finalidades autorizadas, su fundamento, transferencias, plazos de conservación y responsables en su aviso integral.</p>
    <h2 className="mt-8 text-xl font-semibold">Acceso y protección</h2>
    <p className="mt-3">El acceso a información privada requiere una cuenta y permisos. Los perfiles administrativos deben utilizar verificación en dos pasos. No compartas contraseñas ni códigos del autenticador. Para recuperar una cuenta sin buzón de correo, acude a Control Escolar para que verifique tu identidad.</p>
    <h2 className="mt-8 text-xl font-semibold">Solicitudes sobre tus datos</h2>
    <p className="mt-3">Solicita a la institución el procedimiento oficial para ejercer tus derechos de acceso, rectificación, cancelación u oposición y el contacto de su Unidad de Transparencia. Evita enviar expedientes, CURP o documentos sensibles a través de redes sociales públicas.</p>
    <h2 className="mt-8 text-xl font-semibold">Cookies y servicios externos</h2>
    <p className="mt-3">Consulta la <Link href="/cookies" className="text-verde underline">política de cookies</Link>. El mapa de Google requiere autorización opcional. El alojamiento y la base de datos utilizan proveedores tecnológicos cuya participación, ubicación y obligaciones debe describir la institución en sus documentos aprobados.</p>
  </main>;
}
