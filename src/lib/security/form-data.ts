import { receiveUploadTicket, UPLOAD_PREFIX } from './upload-tickets';
const ALLOWED_EXTENSIONS = ['png','jpg','jpeg','webp','gif','pdf','doc','docx','odt','ods','odp','xls','xlsx','ppt','pptx','csv','txt','zip','mp4','mp3','wav','ogg','webm'];
export function allowedFileName(name: string) { return ALLOWED_EXTENSIONS.includes(name.split('.').pop()?.toLowerCase() ?? ''); }
/** Limits apply before processing uploads or user supplied form fields. */
export async function validateFormData(data: FormData): Promise<void> {
  let count = 0;
  let totalBytes = 0;
  const resolved: [string, FormDataEntryValue][] = [];
  for (const [name, raw] of Array.from(data.entries())) {
    let value = raw;
    if (++count > 1500 || name.length > 200) throw new Error('Formulario demasiado grande.');
    if (typeof value === 'string' && value.startsWith(UPLOAD_PREFIX)) value = await receiveUploadTicket(value);
    if (typeof value === 'string') {
      if (value.length > 100_000) throw new Error('El texto supera el tamaño permitido.');
    } else if (value.size > 0) {
      if (value.size > 50 * 1024 * 1024) throw new Error('El archivo supera 50 MB.');
      if ((totalBytes += value.size) > 50 * 1024 * 1024) throw new Error('Los archivos del formulario superan 50 MB en total.');
      const ext = value.name.split('.').pop()?.toLowerCase() ?? '';
      if (['html', 'htm', 'svg', 'js', 'mjs', 'exe', 'com', 'bat', 'cmd', 'ps1', 'sh', 'php'].includes(ext)) {
        throw new Error('Este tipo de archivo no está permitido.');
      }
      if (!allowedFileName(value.name)) throw new Error('Tipo de archivo no permitido.');
      const head = new Uint8Array(await value.slice(0, 16).arrayBuffer());
      const starts = (bytes: number[]) => bytes.every((byte,index) => head[index] === byte);
      const signature = ext === 'pdf' ? starts([37,80,68,70,45])
        : ext === 'png' ? starts([137,80,78,71,13,10,26,10])
        : ['jpg','jpeg'].includes(ext) ? starts([255,216,255])
        : ext === 'gif' ? starts([71,73,70,56])
        : ext === 'webp' ? starts([82,73,70,70]) && head[8]===87 && head[9]===69 && head[10]===66 && head[11]===80
        : ['docx','xlsx','pptx','odt','ods','odp','zip'].includes(ext) ? starts([80,75,3,4])
        : ['doc','xls','ppt'].includes(ext) ? starts([208,207,17,224,161,177,26,225])
        : ['csv','txt'].includes(ext) ? !head.includes(0) : true;
      if (!signature) throw new Error('El contenido del archivo no coincide con su extensión.');
      if (value.type.startsWith('image/') && !['image/png','image/jpeg','image/webp','image/gif'].includes(value.type)) throw new Error('Formato de imagen no permitido.');
    }
    resolved.push([name, value]);
  }
  // Preserve repeated names (album photos), including the original ordering.
  for (const name of new Set(resolved.map(([name]) => name))) data.delete(name);
  for (const [name, value] of resolved) data.append(name, value);
}
