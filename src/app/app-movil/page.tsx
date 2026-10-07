// Descarga pública del instalador; el acceso a los datos requiere autenticación.
import { APP_MOVIL } from '@/lib/app-movil';
import QRCode from 'qrcode';
import { PublicGuideEntry } from '@/components/help/PublicGuideEntry';
import { getPublicHelpLinks } from '@/lib/help/public-links.server';
import { getHelpViewer } from '@/lib/help/viewer.server';

export default async function AppMovilPage() {
  const [qrUrl, helpLinks, viewerIdentity] = await Promise.all([QRCode.toDataURL(APP_MOVIL.apkUrl, { width: 280, margin: 2 }), getPublicHelpLinks(), getHelpViewer()]);

  return (
    <><PublicGuideEntry links={helpLinks} viewerIdentity={viewerIdentity} /><main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-3">📱</div>
        <h1 className="font-serif text-4xl text-verde mb-2">App móvil EPO 221</h1>
        <p className="text-gray-600">
          Versión <strong>{APP_MOVIL.version}</strong> · compilación {APP_MOVIL.compilacion} · {APP_MOVIL.fechaPublicacion} · {APP_MOVIL.tamano}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 grid md:grid-cols-2 gap-6 items-center">
        <div className="text-center">
          <img
            src={qrUrl}
            alt="QR para descargar la app"
            className="mx-auto rounded-xl border-4 border-verde/20"
            width={280}
            height={280}
          />
          <p className="text-xs text-gray-500 mt-3">
            Escanea este código con la cámara de tu celular
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-xl text-verde-oscuro">📥 Cómo instalar</h2>
          <ol className="text-sm space-y-2 list-decimal list-inside text-gray-700">
            <li>Escanea el QR con la cámara de tu celular Android</li>
            <li>Toca el link que aparece</li>
            <li>Descarga el instalador Android desde el enlace</li>
            <li>Abre el archivo APK descargado</li>
            <li>
              Si Android te pregunta, permite <em>"Instalar apps de fuentes desconocidas"</em> para tu navegador
            </li>
            <li>Toca <strong>"Instalar"</strong></li>
            <li>Abre la app y entra con tu correo y contraseña institucional</li>
          </ol>

          <a
            href={APP_MOVIL.apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-verde-oscuro hover:bg-verde-oscuro/90 text-white font-semibold py-3 rounded-xl shadow-md shadow-verde/30 transition"
          >
            📥 Descargar app Android
          </a>
          <p className="text-xs text-gray-500 text-center">
            También puedes copiar el link y abrirlo en tu celular directamente
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Sobre Android e iPhone</h3>
        <ul className="text-sm text-amber-900 space-y-1">
          <li>• <strong>Android:</strong> APK directo para Android 7 o posterior. Verificado en emulador Android 10; otros dispositivos pueden requerir ajustes.</li>
          <li>• <strong>iPhone:</strong> usa el portal escolar desde Safari. Todavía no hay un instalador iOS verificado.</li>
        </ul>
      </div>

      <div className="bg-verde-claro/15 border border-verde rounded-xl p-4">
        <h3 className="font-semibold text-verde-oscuro mb-2">✨ Qué puedes hacer en la app</h3>
        <ul className="text-sm text-verde-oscuro space-y-1">
          <li>• Ver tus calificaciones por materia y promedios</li>
          <li>• Consultar tu horario diario (L-V)</li>
          <li>• Entregar tareas y consultar la bandeja de pendientes</li>
          <li>• Leer avisos y la guía escolar publicada</li>
          <li>• Usar una guía interactiva adaptada a tu rol y ayuda para cada pantalla</li>
          <li>• Recibir notificaciones</li>
          <li>• Acceder a tu perfil</li>
        </ul>
        <p className="text-xs text-verde-oscuro/70 mt-2">
          Las funciones disponibles dependen de tu rol. El personal autorizado puede revisar ciclos con verificación de seguridad y registrar su cierre o reapertura.
        </p>
        <p className="text-sm text-verde-oscuro mt-3">
          Después de entrar, toca <strong>Ayuda de esta pantalla</strong> o abre <strong>Guía interactiva</strong> en Más o en el portal de tu rol. Puedes avanzar, volver, reiniciar y abrir la sección que quieras aprender a usar.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-600">
          ¿Problemas para instalar? Acude a la dirección o usa el sitio web normal desde tu navegador móvil.
        </p>
      </div>
    </main></>
  );
}
