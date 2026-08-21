/**
 * Generates the 3Brothers PWA icon set from a single source image, with zero
 * dependencies (Node's zlib does the heavy lifting).
 *
 * Run: node scripts/generate-icons.mjs [path-to-source.png]
 * Default source: public/app-icon-source.png
 *
 * Why this exists rather than a one-off resize: the source has a transparent
 * surround, and a *maskable* icon must be opaque edge to edge — Android crops
 * it to a circle/squircle, and transparent corners show through as white
 * notches. So the maskable variants are flattened onto the brand green and
 * inset into the 80% safe zone.
 */
import { deflateSync, inflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ?? join(root, "public", "app-icon-source2.png");

/** Backdrop for flattened icons. Sampled from the source artwork. */
const BRAND_GREEN = [10, 74, 47];

/** Fraction of a maskable icon guaranteed to survive cropping. */
const SAFE_ZONE = 0.8;

/* ------------------------------ PNG decoding ------------------------------ */

function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("Not a PNG");

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette = null;
  let alphaTable = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error("Interlaced PNGs are not supported");
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      alphaTable = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported color type: ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  // Undo the per-scanline filters (PNG spec §9).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    const prior = out - stride;

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? pixels[out + i - channels] : 0;
      const b = y > 0 ? pixels[prior + i] : 0;
      const c = y > 0 && i >= channels ? pixels[prior + i - channels] : 0;
      const x = line[i];

      let value;
      switch (filter) {
        case 0:
          value = x;
          break;
        case 1:
          value = x + a;
          break;
        case 2:
          value = x + b;
          break;
        case 3:
          value = x + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`Unknown filter type: ${filter}`);
      }
      pixels[out + i] = value & 0xff;
    }
  }

  // Normalize every colour type to straight RGBA.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const src = i * channels;
    const dst = i * 4;
    let r, g, b, a;

    if (colorType === 3) {
      const index = pixels[src];
      r = palette[index * 3];
      g = palette[index * 3 + 1];
      b = palette[index * 3 + 2];
      a = alphaTable && index < alphaTable.length ? alphaTable[index] : 255;
    } else if (colorType === 0) {
      r = g = b = pixels[src];
      a = 255;
    } else if (colorType === 4) {
      r = g = b = pixels[src];
      a = pixels[src + 1];
    } else if (colorType === 2) {
      [r, g, b] = [pixels[src], pixels[src + 1], pixels[src + 2]];
      a = 255;
    } else {
      [r, g, b, a] = [
        pixels[src],
        pixels[src + 1],
        pixels[src + 2],
        pixels[src + 3],
      ];
    }

    rgba[dst] = r;
    rgba[dst + 1] = g;
    rgba[dst + 2] = b;
    rgba[dst + 3] = a;
  }

  return { width, height, rgba };
}

/* ------------------------------ PNG encoding ------------------------------ */

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------- Resampling ------------------------------- */

/**
 * Box-filter downscale. The source is far larger than any output, so averaging
 * every contributing source pixel avoids the aliasing a nearest-neighbour or
 * naive bilinear sample would produce on this artwork's fine bevels.
 */
function resample(src, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.max(y0 + 1, Math.min(srcH, Math.ceil((y + 1) * yRatio)));

    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.max(x0 + 1, Math.min(srcW, Math.ceil((x + 1) * xRatio)));

      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * srcW + sx) * 4;
          const alpha = src[i + 3];
          // Weight colour by alpha so transparent pixels don't darken edges.
          r += src[i] * alpha;
          g += src[i + 1] * alpha;
          b += src[i + 2] * alpha;
          a += alpha;
          n++;
        }
      }

      const dst = (y * dstW + x) * 4;
      if (a === 0) {
        out[dst] = out[dst + 1] = out[dst + 2] = out[dst + 3] = 0;
      } else {
        out[dst] = Math.round(r / a);
        out[dst + 1] = Math.round(g / a);
        out[dst + 2] = Math.round(b / a);
        out[dst + 3] = Math.round(a / n);
      }
    }
  }

  return out;
}

/** Composites `src` centred on an opaque `background` canvas of `size`. */
function flattenOnto(src, srcSize, size, background) {
  const out = Buffer.alloc(size * size * 4);
  const offset = Math.round((size - srcSize) / 2);

  for (let i = 0; i < size * size; i++) {
    out[i * 4] = background[0];
    out[i * 4 + 1] = background[1];
    out[i * 4 + 2] = background[2];
    out[i * 4 + 3] = 255;
  }

  for (let y = 0; y < srcSize; y++) {
    for (let x = 0; x < srcSize; x++) {
      const s = (y * srcSize + x) * 4;
      const alpha = src[s + 3] / 255;
      if (alpha === 0) continue;

      const d = ((y + offset) * size + (x + offset)) * 4;
      out[d] = Math.round(src[s] * alpha + out[d] * (1 - alpha));
      out[d + 1] = Math.round(src[s + 1] * alpha + out[d + 1] * (1 - alpha));
      out[d + 2] = Math.round(src[s + 2] * alpha + out[d + 2] * (1 - alpha));
      out[d + 3] = 255;
    }
  }

  return out;
}

/* --------------------------------- Build --------------------------------- */

const { width, height, rgba } = decodePng(readFileSync(source));
if (width !== height) {
  console.warn(`Source is ${width}x${height} — a square icon is expected.`);
}

const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

function write(name, size, png) {
  const target = join(outDir, name);
  writeFileSync(target, png);
  console.log(`  ${name.padEnd(28)} ${size}x${size}`);
}

console.log(`Source: ${source} (${width}x${height})\n`);

// Transparent "any" icons — the launcher supplies its own backdrop.
for (const size of [192, 512]) {
  write(`icon-${size}.png`, size, encodePng(size, resample(rgba, width, height, size, size)));
}

// Maskable icons: artwork inset into the safe zone, flattened edge to edge.
for (const size of [192, 512]) {
  const inner = Math.round(size * SAFE_ZONE);
  const scaled = resample(rgba, width, height, inner, inner);
  write(
    `icon-maskable-${size}.png`,
    size,
    encodePng(size, flattenOnto(scaled, inner, size, BRAND_GREEN)),
  );
}

// iOS ignores `purpose` and does not composite alpha — it needs an opaque icon.
{
  const size = 180;
  const scaled = resample(rgba, width, height, size, size);
  write("apple-touch-icon.png", size, encodePng(size, flattenOnto(scaled, size, size, BRAND_GREEN)));
}

console.log("\nDone.");
