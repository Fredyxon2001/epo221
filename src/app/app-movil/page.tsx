// Página pública (dentro de zona privada) para descargar APK Android.
// Accesible desde sidebar de alumno, profesor y admin.
import { APP_MOVIL } from '@/lib/app-movil';

export default function AppMovilPage() {
  // QR generado por API pública de qrserver.com — apunta al APK
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(APP_MOVIL.apkUrl)}&margin=10`;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-3">📱</div>
        <h1 className="font-serif text-4xl text-verde mb-2">App móvil EPO 221</h1>
        <p className="text-gray-600">
          Versión <strong>{APP_MOVIL.version}</strong> · {APP_MOVIL.fechaPublicacion} · {APP_MOVIL.tamano}
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
            <li>Toca <strong>"Descargar"</strong> en la página de Expo</li>
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
            className="block w-full text-center bg-verde hover:bg-verde-oscuro text-white font-semibold py-3 rounded-xl shadow-md shadow-verde/30 transition"
          >
            🔗 Abrir link de descarga
          </a>
          <p className="text-xs text-gray-500 text-center">
            También puedes copiar el link y abrirlo en tu celular directamente
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Sobre Android e iPhone</h3>
        <ul className="text-sm text-amber-900 space-y-1">
          <li>• <strong>Android:</strong> APK directo, instalación sin tienda. Funciona en cualquier celular Android moderno.</li>
          <li>• <strong>iPhone:</strong> aún no disponible. Las apps iOS deben pasar por App Store (requiere cuenta Apple Developer $99 USD/año). Próximamente.</li>
        </ul>
      </div>

      <div className="bg-verde-claro/15 border border-verde rounded-xl p-4">
        <h3 className="font-semibold text-verde-oscuro mb-2">✨ Qué puedes hacer en la app</h3>
        <ul className="text-sm text-verde-oscuro space-y-1">
          <li>• Ver tus calificaciones por materia y promedios</li>
          <li>• Consultar tu horario diario (L-V)</li>
          <li>• Leer avisos institucionales</li>
          <li>• Recibir notificaciones</li>
          <li>• Acceder a tu perfil</li>
        </ul>
        <p className="text-xs text-verde-oscuro/70 mt-2">
          Más funciones próximamente: chat, ficha editable, reglamento firmado, evidencias.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-600">
          ¿Problemas para instalar? Acude a la dirección o usa el sitio web normal desde tu navegador móvil.
        </p>
      </div>
    </div>
  );
}
