/**
 * Rasteriza o SVG do logo do Logo.tsx em PNG nas resoluções padrão e
 * monta um ICO multi-resolução em desktop/build-resources/icon.ico.
 *
 * Uso:  node scripts/generate-icon.cjs
 *
 * Sharp já é dep transitiva do Next/Image (sem instalar nada novo).
 * Formato ICO:
 *   header  6  bytes  reserved(2) + type(2) + count(2)
 *   dir     16 bytes  por imagem (width, height, palette, reserved,
 *                                  planes, bpp, size, offset)
 *   data    PNG bytes
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="256" height="256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffa855"/>
      <stop offset="55%" stop-color="#ff6d0a"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="48" height="48" rx="10" fill="#0c0a09"/>
  <path d="M24 6 C22 10 22 12 24 14 C26 12 26 10 24 6 Z" fill="#ffa855"/>
  <path d="M7 32 L10 17 L17 23 L24 13 L31 23 L38 17 L41 32 Z"
    fill="url(#g)" stroke="#ff8c28" stroke-width=".6" stroke-linejoin="round"/>
  <rect x="7" y="31" width="34" height="5" rx="1.2"
    fill="url(#g)" stroke="#ff8c28" stroke-width=".6"/>
  <circle cx="17" cy="22" r="1.2" fill="#fafaf5" opacity=".9"/>
  <circle cx="24" cy="13" r="1.3" fill="#fafaf5" opacity=".9"/>
  <circle cx="31" cy="22" r="1.2" fill="#fafaf5" opacity=".9"/>
</svg>`;

const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const svgBuf = Buffer.from(SVG);
  const pngs = await Promise.all(
    SIZES.map((size) =>
      sharp(svgBuf, { density: 384 })
        .resize(size, size)
        .png()
        .toBuffer()
        .then((buf) => ({ size, buf })),
    ),
  );

  // === Monta o ICO ===
  const HEADER = 6;
  const DIR_ENTRY = 16;
  let offset = HEADER + DIR_ENTRY * pngs.length;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type 1 = ICO
  header.writeUInt16LE(pngs.length, 4);  // image count

  const directory = Buffer.alloc(DIR_ENTRY * pngs.length);
  pngs.forEach((p, i) => {
    const base = i * DIR_ENTRY;
    // Width/height são uint8 onde 0 significa 256
    directory[base + 0] = p.size >= 256 ? 0 : p.size;
    directory[base + 1] = p.size >= 256 ? 0 : p.size;
    directory[base + 2] = 0;             // color palette (0 = none)
    directory[base + 3] = 0;             // reserved
    directory.writeUInt16LE(1, base + 4);  // color planes
    directory.writeUInt16LE(32, base + 6); // bits per pixel
    directory.writeUInt32LE(p.buf.length, base + 8); // image size
    directory.writeUInt32LE(offset, base + 12);      // image offset
    offset += p.buf.length;
  });

  const ico = Buffer.concat([header, directory, ...pngs.map((p) => p.buf)]);

  const outDir = path.join(__dirname, "..", "desktop", "build-resources");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "icon.ico");
  fs.writeFileSync(outPath, ico);
  console.log(
    `[icon] ${path.relative(process.cwd(), outPath)} ${ico.length} bytes (${SIZES.join("/")}px)`,
  );
}

main().catch((err) => {
  console.error("[icon] erro:", err);
  process.exit(1);
});
