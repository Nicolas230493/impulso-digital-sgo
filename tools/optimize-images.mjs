// Optimiza imágenes (IMG-004 / PERF-004):
//   src/images/originales/<ruta>/<archivo>.(jpg|jpeg|png)  →  src/images/<ruta>/<archivo>.webp
// Redimensiona a un máximo de 1600 px de ancho y comprime en WebP calidad 80.
// Al final imprime ancho y alto de cada imagen para cargarlos en src/data/contenido.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'src/images/originales');
const OUT = path.join(ROOT, 'src/images');
const MAX_W = 1600;

if (!fs.existsSync(IN)) {
  fs.mkdirSync(IN, { recursive: true });
  console.log('Creada src/images/originales/. Copiá ahí las fotos y capturas y volvé a ejecutar `npm run images`.');
  process.exit(0);
}

const files = fs.readdirSync(IN, { recursive: true }).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (!files.length) console.log('No hay imágenes .jpg/.png en src/images/originales/.');

for (const rel of files) {
  const src = path.join(IN, rel);
  const dest = path.join(OUT, rel.replace(/\.(jpe?g|png)$/i, '.webp'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const info = await sharp(src).rotate().resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  const before = fs.statSync(src).size;
  console.log(
    `✔ /images/${path.relative(OUT, dest)}  ${info.width}×${info.height}  ${(before / 1024).toFixed(0)} KB → ${(info.size / 1024).toFixed(0)} KB`,
  );
}
