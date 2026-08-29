// Configuración del APK móvil disponible para descarga.
//
// El instalador vive en Supabase Storage (bucket público `app-movil`), NO en los
// artefactos de EAS Build: esos caducan a los 30 días y el enlace del sitio
// quedaba muerto con un error `NoSuchKey`. Aquí el archivo no expira.
//
// Para publicar una versión nueva:
//   1. npx eas build --platform android --profile preview
//   2. Descarga el .apk que genera
//   3. Súbelo a Supabase → Storage → app-movil, reemplazando `epo221.apk`
//   4. Actualiza `version`, `fechaPublicacion` y `tamano` aquí abajo
//
// El nombre del archivo no cambia, así que el enlace y el QR siguen sirviendo.
const SUPABASE_URL = 'https://hvycaqghrkvspkzouape.supabase.co';

export const APP_MOVIL = {
  version: '1.0.0',
  fechaPublicacion: '2026-08-29',
  apkUrl: `${SUPABASE_URL}/storage/v1/object/public/app-movil/epo221.apk`,
  projectPage: 'https://expo.dev/accounts/fredyxon10/projects/epo221-mobile',
  tamano: '~43 MB',
};
