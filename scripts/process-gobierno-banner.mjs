// Procesa public/img/gobierno-edomex-sep.png:
//  - elimina el fondo blanco (lo vuelve transparente con borde suave)
//  - recorta márgenes vacíos (trim)
//  - re-guarda optimizado
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const FILE   = path.resolve('public/img/gobierno-edomex-sep.png');
const FILE2X = path.resolve('public/img/gobierno-edomex-sep@2x.png');
const BACKUP = path.resolve('public/img/gobierno-edomex-sep.original.png');

const THRESHOLD = 180; // R,G,B >= 180 -> empiezan a transparentar
const FEATHER = 15;    // alpha proporcional en la franja de borde

// Alturas objetivo. La altura de display real en la navbar es 64 px (48 scrolled).
// Generamos @1x ~128 px y @2x ~256 px para 1x/2x crujiente incluso con zoom.
const H_1X = 128;
const H_2X = 256;

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error('No existe:', FILE);
    process.exit(1);
  }

  // Respaldo por si hay que rehacer
  if (!fs.existsSync(BACKUP)) {
    fs.copyFileSync(FILE, BACKUP);
    console.log('Respaldo ->', BACKUP);
  }

  const src = sharp(BACKUP).ensureAlpha();
  const meta = await src.metadata();
  console.log('Origen:', meta.width, 'x', meta.height, meta.format);

  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const minRGB = Math.min(r, g, b);
    if (minRGB >= THRESHOLD + FEATHER) {
      data[i + 3] = 0;
    } else if (minRGB >= THRESHOLD) {
      const t = (minRGB - THRESHOLD) / FEATHER;
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
    }
  }

  // Imagen intermedia en memoria (aún a resolución completa, con fondo transparente y recortada)
  const trimmed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();
  const aspect = trimmedMeta.width / trimmedMeta.height;
  console.log('Trim ->', trimmedMeta.width, 'x', trimmedMeta.height, '(aspect', aspect.toFixed(3), ')');

  async function render(outPath, targetHeight) {
    const targetWidth = Math.round(targetHeight * aspect);
    await sharp(trimmed)
      .resize(targetWidth, targetHeight, {
        kernel: sharp.kernel.lanczos3,
        fit: 'fill',
      })
      // Micro-sharpen para rescatar nitidez tras el downscale
      .sharpen({ sigma: 0.6, m1: 0.4, m2: 2 })
      .png({ compressionLevel: 9, palette: false, quality: 100 })
      .toFile(outPath);
    const s = fs.statSync(outPath);
    console.log('OK ->', outPath, `(${targetWidth}x${targetHeight}, ${(s.size / 1024).toFixed(1)} KB)`);
  }

  await render(FILE,   H_1X);
  await render(FILE2X, H_2X);
}

main().catch(e => { console.error(e); process.exit(1); });
