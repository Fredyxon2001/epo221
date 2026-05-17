'use client';
// Botón para suscribirse a push notifications web.
// Requiere VAPID_PUBLIC_KEY en NEXT_PUBLIC_VAPID_PUBLIC_KEY.
import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotifToggle() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return;
    }
    if (Notification.permission === 'denied') setStatus('denied');
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.pushManager.getSubscription().then((sub) => sub && setStatus('subscribed'));
    });
  }, []);

  const subscribe = async () => {
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) { alert('Push no configurado (falta VAPID key)'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
        }),
      });
      setStatus('subscribed');
    } catch (e) {
      console.error(e); alert('No se pudo activar push');
    }
  };

  if (status === 'unsupported') return null;

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={status === 'subscribed' || status === 'denied'}
      className="text-xs px-3 py-1.5 rounded-full bg-verde hover:bg-verde-oscuro text-white font-semibold disabled:opacity-50"
      title="Recibir notificaciones aunque no tengas la pestaña abierta"
    >
      {status === 'subscribed' ? '🔔 Push activado' : status === 'denied' ? '🚫 Bloqueado' : '🔔 Activar push'}
    </button>
  );
}
