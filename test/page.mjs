import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Everything is resolved from this file, so the suite runs from any checkout.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');

const html = readFileSync(join(ROOT, 'dist/chrome/page/index.html'), 'utf8');

const results = [];
const check = (name, pass, extra = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? `  [${extra}]` : ''}`);
};

const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));

const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'dangerously', virtualConsole: vc });
const { document } = dom.window;

check('page parses', Boolean(document.querySelector('h1')));
check('no build placeholders left', !/__[A-Z_]+__/.test(html));
check('no script errors', errors.length === 0, errors.join(' | '));
check('no external resource requests', document.querySelectorAll('script[src], link[rel="stylesheet"], img').length === 0);
check('no inline event handlers', !/\son[a-z]+=/i.test(html));

const ids = ['features', 'how', 'install', 'privacy', 'roadmap', 'support', 'faq'];
check('all sections present', ids.every(id => document.getElementById(id)), ids.filter(id => !document.getElementById(id)).join(','));
const zips = Array.from(document.querySelectorAll('a[download]')).map(a => a.getAttribute('href'));
const browsers = ['chrome', 'edge', 'brave', 'opera', 'firefox', 'safari'];
check('download for every browser', browsers.every(b => zips.some(h => h.endsWith(`-${b}.zip`))), browsers.filter(b => !zips.some(h => h.endsWith(`-${b}.zip`))).join(','));
check('all downloads are zip assets', zips.every(h => h.endsWith('.zip')), zips.filter(h => !h.endsWith('.zip')).join(','));
check('no dead internal anchors', Array.from(document.querySelectorAll('a[href^="#"]')).every(a => a.getAttribute('href') === '#' || document.querySelector(a.getAttribute('href'))));

// Derived from package.json the same way build.mjs does, so the test tracks the
// version instead of hard-coding one and failing on every release.
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const repoUrl = String(pkg.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
const releaseBase = `${repoUrl}/releases/download/v${pkg.version}`;

const chromeHref = document.querySelector('a[download]').getAttribute('href');
check('download points at the release asset', chromeHref === `${releaseBase}/focus-exe-${pkg.version}-chrome.zip`, chromeHref);
check(
  'every download is under this release',
  zips.every(h => h.startsWith(`${releaseBase}/`)),
  zips.filter(h => !h.startsWith(`${releaseBase}/`)).join(',')
);

const support = key => document.querySelector(`[data-support="${key}"]`);
check('coffee link falls back, never 404s', support('coffee').href === 'https://www.buymeacoffee.com/');
check('sponsors link falls back', support('sponsors').href === 'https://github.com/sponsors');
check('paypal link falls back', support('paypal').href === 'https://www.paypal.com/');
check('upi disabled until configured', support('upi').getAttribute('aria-disabled') === 'true' && !support('upi').hasAttribute('href'));
check('setup notes are visible', document.querySelectorAll('.note:not([hidden])').length === 4,
  document.querySelectorAll('.note:not([hidden])').length + ' notes');
check('every unconfigured platform is flagged', ['coffee', 'sponsors', 'upi', 'paypal']
  .every(k => Boolean(document.querySelector(`[data-note="${k}"]:not([hidden])`))));
check('upi id is only shown once configured', document.querySelector('[data-upi-id]').hidden);
check('upi button does not claim to copy', /pay/i.test(support('upi').textContent) && !/copy/i.test(support('upi').textContent),
  support('upi').textContent);
check('share preview metadata present', Boolean(document.querySelector('meta[property="og:title"]')) && Boolean(document.querySelector('meta[property="og:description"]')));
check('sticky header cannot cover an anchor target', /scroll-padding-top:\s*\d/.test(html));
check('code blocks scroll instead of widening the page', /\.grid > \* \{ min-width: 0; \}/.test(html));
check('accessible landmarks', document.querySelectorAll('main').length === 1 && document.querySelectorAll('footer').length === 1);
check('every section has a heading', Array.from(document.querySelectorAll('section')).every(s => s.querySelector('h1,h2,h3')));
check('lang and viewport set', document.documentElement.lang === 'en' && Boolean(document.querySelector('meta[name="viewport"]')));

/* once handles are configured the links must switch over */
const configured = html.replace("coffee: 'REPLACE_ME_BUY_ME_A_COFFEE_HANDLE'", "coffee: 'https://www.buymeacoffee.com/testuser'")
  .replace("sponsors: 'REPLACE_ME_GITHUB_USERNAME'", "sponsors: 'https://github.com/sponsors/testuser'")
  .replace("paypal: 'REPLACE_ME_PAYPAL_LINK'", "paypal: 'https://www.paypal.com/paypalme/testuser'")
  .replace("upi: 'REPLACE_ME_UPI_ID'", "upi: 'tester@upi'");
const dom2 = new JSDOM(configured, { runScripts: 'dangerously', virtualConsole: vc });
const d2 = dom2.window.document;
check('configured coffee link applied', d2.querySelector('[data-support="coffee"]').href === 'https://www.buymeacoffee.com/testuser');
check('configured paypal link applied', d2.querySelector('[data-support="paypal"]').href === 'https://www.paypal.com/paypalme/testuser');
check('configured upi becomes a pay intent', d2.querySelector('[data-support="upi"]').getAttribute('href') === 'upi://pay?pa=tester%40upi');
check('configured upi id is shown for copying', !d2.querySelector('[data-upi-id]').hidden &&
  d2.querySelector('[data-upi-id] code').textContent === 'tester@upi');
check('notes hidden once configured', d2.querySelectorAll('.note:not([hidden])').length === 0,
  d2.querySelectorAll('.note:not([hidden])').length + ' notes left');

const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
