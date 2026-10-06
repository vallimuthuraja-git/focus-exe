/**
 * Runs every suite in this folder and exits non-zero if any check fails.
 *
 * The suites exercise the *built* bundles (dist/chrome/*.js) rather than the
 * TypeScript sources, so they catch what actually ships. `npm test` builds
 * first; running this file directly tells you to build if the output is stale
 * or missing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const artifacts = [
  'dist/chrome/content.js',
  'dist/chrome/background.js',
  'dist/chrome/page/index.html',
  'dist/chrome/manifest.json'
];
const missing = artifacts.filter(file => !existsSync(join(ROOT, file)));
if (missing.length > 0) {
  console.error(
    `Missing build output:\n${missing.map(file => `  ${file}`).join('\n')}\n\nRun \`npm run build\` first.`
  );
  process.exit(1);
}

/* The content script must be declared in the manifest so the widget ships in
   every tab and window, not injected on demand into just the active tab. */
const manifest = JSON.parse(readFileSync(join(ROOT, 'dist/chrome/manifest.json'), 'utf8'));
const cs = manifest.content_scripts?.[0];
const manifestChecks = {
  'manifest declares <all_urls> content script': cs?.matches?.includes('<all_urls>') === true,
  'content script references content.js': cs?.js?.includes('content.js') === true,
  'no stray <all_urls> in permissions':
    !(manifest.permissions ?? []).includes('<all_urls>') &&
    !(manifest.host_permissions ?? []).includes('<all_urls>')
};
for (const [label, pass] of Object.entries(manifestChecks)) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
}
if (!Object.values(manifestChecks).every(Boolean)) {
  console.error('\nManifest does not declare the all-tabs content script.');
  process.exit(1);
}

const suites = ['page.mjs', 'worker.mjs', 'smoke.mjs'];
const failed = [];

for (const suite of suites) {
  console.log(`\n${'='.repeat(60)}\n${suite}\n${'='.repeat(60)}`);
  const result = spawnSync(process.execPath, [join(HERE, suite)], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed.push(suite);
  }
}

console.log('');
if (failed.length === 0) {
  console.log(`All ${suites.length} suites passed.`);
} else {
  console.error(`FAILED: ${failed.join(', ')}`);
}
process.exit(failed.length === 0 ? 0 : 1);