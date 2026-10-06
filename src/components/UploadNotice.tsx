'use client';
import { useEffect, useState } from 'react';
export function UploadNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onError = (event: Event) => setMessage(String((event as CustomEvent).detail));
    window.addEventListener('epo-upload-error', onError);
    return () => window.removeEventListener('epo-upload-error', onError);
  }, []);
  if (!message) return null;
  return <div role="alert" className="fixed bottom-20 right-4 left-4 md:left-auto md:max-w-md z-50 border border-rose-200 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 shadow-lg">
    {message}<button onClick={() => setMessage('')} className="block mt-2 font-semibold underline">Cerrar aviso</button>
  </div>;
}
