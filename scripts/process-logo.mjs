// Convierte Logo-EPO221.jpeg a PNG con fondo transparente.
// Estrategia: detecta píxeles "casi blancos" y los pone en alpha=0.
// Hace recorte cuadrado y resize a 512x512.
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const SRC = 'C:/Users/Ing Alfredo Teran/OneDrive/Documentos/ProyecSkul/Logo-EPO221.jpeg';
const OUT = path.resolve('public/img/logo-epo221.png');

const THRESHOLD = 235; // píxeles con R,G,B >= 235 se vuelven transparentes
const FEATHER = 20;    // suaviza bordes (alpha proporcional entre THRESHOLD y THRESHOLD+FEATHER hacia abajo)

async function main() {
  const img = sharp(SRC).ensureAlpha();
  const meta = await img.metadata();
  console.log('Origen:', meta.width, 'x', meta.height, meta.format);

  // Recorte cuadrado central
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width  - side) / 2);
  const top  = Math.floor((meta.height - side) / 2);

  const { data, info } = await img
    .extract({ left, top, width: side, height: side })
    .resize(1024, 1024, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Hacer transparente el fondo blanco
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const minRGB = Math.min(r, g, b);
    if (minRGB >= THRESHOLD + FEATHER) {
      data[i + 3] = 0;
    } else if (minRGB >= THRESHOLD) {
      // borde suave
      const t = (minRGB - THRESHOLD) / FEATHER;
      data[i + 3] = Math.round(255 * (1 - t));
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const stat = fs.statSync(OUT);
  console.log('OK ->', OUT, '(', (stat.size / 1024).toFixed(1), 'KB )');
}

main().catch(e => { console.error(e); process.exit(1); });
