export function AuthenticatorHelp({ configured }: { configured: boolean }) {
  return <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950 space-y-3">
    <p><strong>Aplicación recomendada: Google Authenticator, de Google LLC.</strong> Si ya tienes otra aplicación TOTP configurada, puedes seguir usándola.</p>
    <div className="flex flex-wrap gap-3">
      <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Descargar para Android</a>
      <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Descargar para iPhone</a>
    </div>
    {configured ? <p>Abre tu autenticador y busca la cuenta EPO 221. Escribe aquí sus seis dígitos actuales para continuar.</p> : <ol className="list-decimal pl-5 space-y-2">
      <li>Instala Google Authenticator y pulsa aquí <strong>Configurar autenticador</strong>.</li>
      <li>En Google Authenticator pulsa <strong>+</strong> para agregar la cuenta EPO 221 y escanea el QR. Si usas el mismo teléfono, abre <strong>Configurar manualmente</strong>, introduce la clave y elige <strong>Basado en el tiempo</strong>.</li>
      <li>Regresa al sistema, escribe el código de seis dígitos y pulsa <strong>Verificar y continuar</strong>.</li>
    </ol>}
    <p className="text-xs">Si el código vence, usa el siguiente y comprueba que tu teléfono tenga la hora automática. No compartas el QR, la clave ni los códigos.</p>
  </div>;
}
