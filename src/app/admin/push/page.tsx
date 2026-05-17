// Admin: configurar webhook URL/secret + probar push.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { guardarConfigPush } from './actions';

export default async function PushConfigPage() {
  const supabase = createClient();
  const { data: cfg } = await supabase.from('push_webhook_config').select('*').eq('id', 1).maybeSingle();
  const { count: suscritos } = await supabase
    .from('push_subscriptions').select('id', { count: 'exact', head: true });

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        eyebrow="Sistema · Notificaciones"
        title="🔔 Configuración de Push notifications"
        description="Habilita el envío automático de push web cuando se crea una notificación."
      />

      <Card>
        <div className="text-sm space-y-1">
          <div>Dispositivos suscritos: <strong>{suscritos ?? 0}</strong></div>
          <div>Estado actual: <strong>{cfg?.enabled ? '🟢 Habilitado' : '⚪ Deshabilitado'}</strong></div>
        </div>
      </Card>

      <Card>
        <form action={guardarConfigPush} className="space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-600">Webhook URL (endpoint público del sitio)</span>
            <input name="webhook_url" defaultValue={cfg?.webhook_url ?? ''}
              placeholder="https://tu-dominio.com/api/push/from-trigger"
              className="w-full border rounded px-2 py-1.5 font-mono text-xs" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Secret (cualquier string aleatorio largo)</span>
            <input name="webhook_secret" defaultValue={cfg?.webhook_secret ?? ''}
              placeholder="genera uno con: openssl rand -hex 32"
              className="w-full border rounded px-2 py-1.5 font-mono text-xs" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={cfg?.enabled ?? false} />
            Habilitado (cada notificación nueva dispara push automáticamente)
          </label>
          <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded text-sm">Guardar</button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold text-sm mb-2">📌 Setup</h2>
        <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
          <li>Despliega el sistema (Vercel u otro) para tener URL pública</li>
          <li>Asegúrate de tener configuradas las VAPID keys en variables de entorno (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)</li>
          <li>Configura aquí el Webhook URL → <code>https://tu-dominio.com/api/push/from-trigger</code></li>
          <li>Genera un secret aleatorio largo y pégalo</li>
          <li>Habilita la casilla y guarda</li>
          <li>Los usuarios deben hacer click en "🔔 Activar push" en su perfil para suscribirse</li>
        </ol>
        <p className="text-xs text-gray-500 mt-3">📡 El trigger usa <code>pg_net</code> (extensión Supabase). Si falla, el insert de notificación sigue funcionando normal.</p>
      </Card>
    </div>
  );
}
