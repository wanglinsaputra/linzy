// One-off generator: rasterizes app/icon.svg into the favicon set.
// Run: npx tsx scripts/gen-favicons.ts
// sharp is already present (Next.js image optimization pulls it in), so this
// adds no dependency. Re-run after editing app/icon.svg.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'app/icon.svg';
const OUT = 'public';

/** PNG sizes emitted as standalone files. */
const PNGS: Array<[string, number]> = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon-48x48.png', 48],
  ['favicon-64x64.png', 64],
  ['apple-touch-icon.png', 180],
];

/** Sizes packed into favicon.ico. 48 covers Windows shortcuts/taskbar. */
const ICO_SIZES = [16, 32, 48];

function render(svg: Buffer, size: number): Promise<Buffer> {
  // density scales librsvg's rasterization grid; the SVG is 64px, so this keeps
  // the geometry sampled at the target resolution instead of upscaling 64px.
  return sharp(svg, { density: Math.ceil((72 * size) / 64) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Builds an ICO containing PNG-compressed entries (supported since Vista, and
 * by every browser that matters). Header layout: 6-byte ICONDIR, then one
 * 16-byte ICONDIRENTRY per image, then the image payloads.
 */
function buildIco(images: Array<{ size: number; data: Buffer }>): Buffer {
  const dir = Buffer.alloc(6 + images.length * 16);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(images.length, 4);

  let offset = dir.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, e); // 0 means 256
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);
    dir.writeUInt8(0, e + 2); // palette count: 0 for truecolor
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // color planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });

  return Buffer.concat([dir, ...images.map((i) => i.data)]);
}

async function main() {
  const svg = await readFile(SRC);

  // favicon.svg is a byte-for-byte copy so the vector stays the single source.
  await copyFile(SRC, `${OUT}/favicon.svg`);

  for (const [name, size] of PNGS) {
    await writeFile(`${OUT}/${name}`, await render(svg, size));
  }

  const ico = buildIco(
    await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await render(svg, size) }))),
  );
  await writeFile(`${OUT}/favicon.ico`, ico);
  // Next.js serves app/favicon.ico automatically at /favicon.ico for the
  // bare-path requests some crawlers and RSS readers still make.
  await writeFile('app/favicon.ico', ico);
}

main();
