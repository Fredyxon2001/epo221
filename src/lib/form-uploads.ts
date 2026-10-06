'use client';

export async function prepareFormUploads(data: FormData): Promise<FormData> {
  const prepared = new FormData();
  let total = 0;
  for (const [name, value] of data.entries()) {
    if (typeof value === 'string' || value.size === 0) { prepared.append(name, value); continue; }
    if ((total += value.size) > 50 * 1024 * 1024) throw new Error('Los archivos superan 50 MB en total.');
    const response = await fetch('/api/uploads/prepare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value.name, size: value.size, type: value.type }),
    });
    const upload = await response.json();
    if (!response.ok) throw new Error(upload.error || 'No se pudo preparar el archivo.');
    const saved = await fetch(upload.signedUrl, {
      method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: value,
    });
    if (!saved.ok) throw new Error('No se pudo cargar el archivo. Comprueba tu conexión e intenta nuevamente.');
    prepared.append(name, upload.ticket);
  }
  return prepared;
}

export function submitWithUploads<T extends { error?: string }>(action: (data: FormData) => Promise<T>, data: FormData): Promise<T>;
export function submitWithUploads(action: (data: FormData) => Promise<void>, data: FormData): Promise<void | { error?: string }>;
export async function submitWithUploads(action: (data: FormData) => Promise<unknown>, data: FormData): Promise<unknown> {
  try { return await action(await prepareFormUploads(data)); }
  catch (error) {
    const message = error instanceof Error && error.message.startsWith('NEXT_REDIRECT') ? null : 'No se pudo completar el envío. Revisa el archivo y tu conexión e intenta nuevamente.';
    if (!message) throw error;
    window.dispatchEvent(new CustomEvent('epo-upload-error', { detail: message }));
    return { error: message };
  }
}
