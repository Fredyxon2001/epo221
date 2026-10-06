'use client';
import { useState, type ComponentProps } from 'react';
import { prepareFormUploads } from '@/lib/form-uploads';

type Props = Omit<ComponentProps<'form'>, 'action'> & { action: (data: FormData) => Promise<void> };
export function UploadForm({ action, children, ...props }: Props) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <form {...props} action={async data => {
    setError(''); setPending(true);
    try { await action(await prepareFormUploads(data)); }
    catch { setError('No se pudo completar el envío. Revisa los datos y el archivo e intenta nuevamente.'); }
    finally { setPending(false); }
  }}>
    <fieldset disabled={pending} className="contents">{children}</fieldset>
    {pending && <p role="status" className="text-sm text-gray-600">Enviando archivos…</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </form>;
}
