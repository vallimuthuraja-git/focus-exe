/**
 * Runs every suite in this folder and exits non-zero if any check fails.
 *
 * The suites exercise the *built* bundles (dist/chrome/*.js) rather than the
 * TypeScript sources, so they catch what actually ships. `npm test` builds
 * first; running this file directly tells you to build if the output is stale
 * or missing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const artifacts = [
  'dist/chrome/content.js',
  'dist/chrome/background.js',
  'dist/chrome/page/index.html'
];
const missing = artifacts.filter(file => !existsSync(join(ROOT, file)));
if (missing.length > 0) {
  console.error(
    `Missing build output:\n${missing.map(file => `  ${file}`).join('\n')}\n\nRun \`npm run build\` first.`
  );
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