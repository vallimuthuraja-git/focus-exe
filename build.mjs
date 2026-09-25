import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const cache = join(root, '.build');

const flags = new Set(process.argv.slice(2));
const value = (name, fallback) => {
  const hit = process.argv.slice(2).find(arg => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const dev = flags.has('--dev');
const wantZip = flags.has('--zip') || flags.has('--pack');
const only = value('target', undefined);

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

/* ---------- icons: generated so no binary assets live in the repo ---------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
};

function sampleIcon(u, v) {
  const size = 1;
  const radius = 0.22;
  const dx = Math.max(radius - u, u - (size - radius), 0);
  const dy = Math.max(radius - v, v - (size - radius), 0);
  if (dx * dx + dy * dy > radius * radius) {
    return [0, 0, 0, 0];
  }

  const mix = (from, to, amount) => from + (to - from) * amount;
  let color = [mix(29, 12, v), mix(45, 22, v), mix(60, 30, v), 255];

  const cx = 0.5;
  const cy = 0.5;
  const distance = Math.hypot(u - cx, v - cy);
  const ringOuter = 0.4;
  const ringWidth = 0.05;

  if (distance <= ringOuter && distance >= ringOuter - ringWidth) {
    color = [120, 214, 255, 255];
  }

  const up = { x: cx, y: cy - 0.3 };
  const right = { x: cx + 0.2 * Math.sin((60 * Math.PI) / 180), y: cy - 0.2 * Math.cos((60 * Math.PI) / 180) };
  const handWidth = 0.075;
  if (distanceToSegment(u, v, cx, cy, up.x, up.y) <= handWidth / 2) {
    color = [244, 247, 248, 255];
  }
  if (distanceToSegment(u, v, cx, cy, right.x, right.y) <= handWidth / 2) {
    color = [244, 247, 248, 255];
  }
  if (distance <= 0.05) {
    color = [244, 247, 248, 255];
  }
  return color;
}

function renderIcon(size) {
  const samples = 3;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const [cr, cg, cb, ca] = sampleIcon(
            (x + (sx + 0.5) / samples) / size,
            (y + (sy + 0.5) / samples) / size
          );
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const total = samples * samples;
      const offset = (y * size + x) * 4;
      const alpha = a / total;
      pixels[offset] = alpha > 0 ? Math.round(r / a) : 0;
      pixels[offset + 1] = alpha > 0 ? Math.round(g / a) : 0;
      pixels[offset + 2] = alpha > 0 ? Math.round(b / a) : 0;
      pixels[offset + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, pixels);
}

/* ------------------------------- build --------------------------------- */

const repoUrl = String(pkg.repository?.url ?? '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');
const releaseBase = `${repoUrl}/releases/download/v${pkg.version}`;
const pageSource = await readFile(join(root, 'page/index.html'), 'utf8');
const pageHtml = pageSource
  .replaceAll('__VERSION__', pkg.version)
  .replaceAll('__RELEASE_BASE__', releaseBase)
  .replaceAll('__REPO_URL__', repoUrl);

if (flags.has('--page')) {
  // preview only: render the product page without bundling the extension
  await mkdir(join(dist, 'page'), { recursive: true });
  await writeFile(join(dist, 'page/index.html'), pageHtml);
  console.log(`Product page v${pkg.version} -> dist/page/index.html`);
  process.exit(0);
}

await rm(cache, { recursive: true, force: true });
await mkdir(cache, { recursive: true });

const shared = {
  bundle: true,
  format: 'iife',
  target: ['chrome102', 'firefox115', 'safari16'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  legalComments: 'none',
  loader: { '.css': 'text' },
  logLevel: 'warning'
};

await esbuild.build({
  ...shared,
  entryPoints: { content: join(root, 'src/content.ts'), background: join(root, 'src/background.ts') },
  outdir: cache
});

await esbuild.build({
  ...shared,
  entryPoints: [join(root, 'src/manifest.ts')],
  outfile: join(cache, 'manifest.mjs'),
  format: 'esm',
  minify: false
});

const { createTargets } = await import(pathToFileURL(join(cache, 'manifest.mjs')).href);
const targets = createTargets({
  version: pkg.version,
  description: pkg.description
}).filter(target => !only || only.split(',').includes(target.dir));

if (targets.length === 0) {
  throw new Error(`No target matched --target=${only}`);
}

const icons = new Map([16, 32, 48, 128].map(size => [size, renderIcon(size)]));

for (const target of targets) {
  const out = join(dist, target.dir);
  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, 'icons'), { recursive: true });
  await mkdir(join(out, 'page'), { recursive: true });

  await copyFile(join(cache, 'content.js'), join(out, 'content.js'));
  await copyFile(join(cache, 'background.js'), join(out, 'background.js'));
  for (const [size, data] of icons) {
    await writeFile(join(out, `icons/icon${size}.png`), data);
  }
  await writeFile(join(out, 'manifest.json'), `${JSON.stringify(target.manifest, null, 2)}\n`);
  await writeFile(join(out, 'page/index.html'), pageHtml);

  if (wantZip) {
    const archive = join(dist, `focus-exe-${pkg.version}-${target.dir}.zip`);
    await rm(archive, { force: true });
    execFileSync('zip', ['-qr', archive, '.'], { cwd: out });
    console.log(`  zipped  ${target.dir}`);
  } else {
    console.log(`  built   ${target.dir}`);
  }
}

console.log(`\nFocus Exe ${pkg.version}: ${targets.map(t => t.dir).join(', ')} -> dist/`);

