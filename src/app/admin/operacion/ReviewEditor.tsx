'use client';

import { useState, type ReactNode, type SyntheticEvent } from 'react';

/** The server remains authoritative for authorization, MFA, version and fingerprints. */
export function ReviewEditor({ children, approval, formId }: { children: ReactNode; approval: ReactNode; formId: string }) {
  const [dirty, setDirty] = useState(false);
  const markDirty = (event: SyntheticEvent<HTMLDivElement>) => {
    // The hidden input named id shadows HTMLFormElement.id (named properties).
    if ((event.target as HTMLElement).closest('form')?.getAttribute('id') === formId) setDirty(true);
  };
  return <div className="space-y-4" onInputCapture={markDirty} onChangeCapture={markDirty}>
    {children}
    <p role="status" aria-live="polite" className="text-sm text-slate-700">
      {dirty ? 'Hay cambios sin guardar. Guarda el borrador antes de aprobar; la aprobación corresponde a la ficha guardada.' : 'La aprobación corresponde a la ficha guardada. Guarda primero cualquier cambio.'}
    </p>
    <fieldset disabled={dirty} className="min-w-0 disabled:opacity-60">
      <legend className="sr-only">Aprobación de la ficha guardada</legend>
      {approval}
    </fieldset>
  </div>;
}
