import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Everything is resolved from this file, so the suite runs from any checkout.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');
const bundle = readFileSync(join(ROOT, 'dist/chrome/content.js'), 'utf8');

const results = [];
const check = (name, pass, extra = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? `  [${extra}]` : ''}`);
};
const wait = ms => new Promise(r => setTimeout(r, ms));

/** Boots a fresh page, injects the built content script like the worker would. */
function boot({ url = 'https://anthropic-partners.skilljar.com/en/course', seed = null } = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(`jsdom: ${e.message}`));
  vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));

  const dom = new JSDOM('<!doctype html><html><body><div id="app">course page</div></body></html>', {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc
  });

  const { window } = dom;
  const store = seed ? { focusExeStateV1: seed } : {};
  const sent = [];
  const listeners = [];

  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.chrome = {
    runtime: {
      id: 'smoke',
      lastError: undefined,
      getURL: p => `chrome-extension://smoke/${p}`,
      sendMessage: (msg, cb) => { sent.push(msg); cb?.(); },
      onMessage: { addListener: fn => listeners.push(fn) }
    },
    storage: {
      local: {
        get: (key, cb) => cb(key in store ? { [key]: store[key] } : {}),
        set: (items, cb) => { Object.assign(store, items); cb?.(); }
      }
    },
    notifications: { create: () => {} }
  };

  // open the root only so the test can see inside the closed one
  const realAttach = window.Element.prototype.attachShadow;
  window.Element.prototype.attachShadow = function (init) {
    return realAttach.call(this, { ...init, mode: 'open' });
  };

  const deliver = (message, sender = { id: 'smoke' }) => {
    let responded;
    for (const listener of listeners) {
      listener(message, sender, response => { responded = response; });
    }
    return responded;
  };

  const host = () => window.document.getElementById('focus-exe-host');
  const root = () => host()?.shadowRoot.querySelector('.assistant') ?? null;
  const text = selector => root()?.querySelector(selector)?.textContent ?? null;
  const click = selector => {
    const node = root().querySelector(selector);
    if (!node) throw new Error(`missing ${selector}`);
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  const digits = selector => {
    const clock = root().querySelector(selector);
    return Array.from(clock.querySelectorAll('.digit .number.current')).map(n => n.textContent).join('');
  };

  return { window, store, sent, deliver, host, root, text, click, digits, errors };
}

/* 1. nothing runs until the user summons the widget */
const app = boot();
check('page untouched before summon', !app.host());
check('no extension state on the page', !('__focusExeInjected' in app.window));

app.window.eval(bundle);
await wait(60);

check('widget mounted on injection', Boolean(app.host()) && Boolean(app.root()));
check('widget lives in its own shadow root', app.root().getRootNode() === app.host().shadowRoot);
check('host has no page-visible children', app.host().children.length === 0);
check('focus clock reads 25:00', app.digits('.focus-clock:not(.mini-clock)') === '2500', app.digits('.focus-clock:not(.mini-clock)'));
check('mini clock reads 25:00', app.digits('.mini-clock') === '2500', app.digits('.mini-clock'));
check('deadline clock has 9 digits', app.digits('.card .deadline-clock').length === 9, app.digits('.card .deadline-clock'));
check('deadline label built from config', app.text('.deadline-label') === 'December 31 deadline', app.text('.deadline-label'));
check('mode label', app.text('.mode-label') === 'Focus session');
check('both audio toggles on', app.root().querySelectorAll('.switch input:checked').length === 4);

/* 2. confirm flow, persistence, pause */
app.click('.start-button');
check('confirmation appears', app.root().classList.contains('confirming-expanded'));
check('confirmation wording', app.text('.confirmation-message') === 'Start the focus session?', app.text('.confirmation-message'));

app.click('.confirm-button');
await wait(320);
check('confirmation cleared', !app.root().classList.contains('confirming-expanded'));
check('button switched to pause', app.text('.start-button .button-label') === 'Pause');
check('running flag on button', app.root().querySelector('.start-button').classList.contains('running'));
check('progress bar rendered', app.root().querySelector('.progress-fill').style.width.endsWith('%'), app.root().querySelector('.progress-fill').style.width);

const beforeTick = app.digits('.focus-clock:not(.mini-clock)');
await wait(3000);
const afterTick = app.digits('.focus-clock:not(.mini-clock)');
check('timer counts down every second', beforeTick !== afterTick && Number(afterTick) < Number(beforeTick), `${beforeTick} -> ${afterTick}`);
check('progress bar advanced', parseFloat(app.root().querySelector('.progress-fill').style.width) > 0, app.root().querySelector('.progress-fill').style.width);
check('running state persisted', app.store.focusExeStateV1?.running === true);

app.click('.start-button');
app.click('.confirm-button');
await wait(320);
check('paused state persisted', app.store.focusExeStateV1?.running === false && typeof app.store.focusExeStateV1?.remaining === 'number');

/* 3. settings, mode switch, minimise */
const noise = app.root().querySelector('.expanded-settings-panel .switch input');
noise.checked = false;
noise.dispatchEvent(new app.window.Event('change', { bubbles: true }));
await wait(320);
check('brown noise off persisted', app.store.focusExeStateV1?.brownNoise === false);
check('mini toggle mirrors state', app.root().querySelector('.mini-settings-panel .switch input').checked === false);

app.click('.switch-button');
check('switch confirmation', app.text('.confirmation-message') === 'Switch to recovery mode?', app.text('.confirmation-message'));
app.click('.confirm-button');
await wait(2000); // two roll cycles (540ms each in a real browser) before reading digits
check('break mode entered', app.root().classList.contains('break-mode'), app.text('.mode-label'));
check('break button label', app.text('.switch-button .button-label') === 'Return to Focus');
// a rolling reel can show the previous second for up to one tick, so allow 0-1s
const snap = () => Array.from(app.root().querySelectorAll('.focus-clock:not(.mini-clock) .digit')).map(d => ({
  cur: d.querySelector('.number.current').textContent,
  next: d.querySelector('.number.next').textContent,
  rolling: d.querySelector('.reel').classList.contains('rolling')
}));
const breakDigits = app.digits('.focus-clock:not(.mini-clock)');
check('break timer reset to 5:00', breakDigits.slice(0, 2) === '05' && Number(breakDigits.slice(2)) <= 1, `${breakDigits} ${JSON.stringify(snap())} store=${JSON.stringify(app.store.focusExeStateV1)}`);

app.click('.minimize-button');
await wait(320);
check('minimized class', app.root().classList.contains('minimized'));
check('minimized persisted', app.store.focusExeStateV1?.minimized === true);

/* 4. overlay handling + escape */
app.click('.settings-pop-button');
check('settings panel opened', app.root().querySelector('.mini-settings-panel').classList.contains('visible'));
check('aria-expanded set', app.root().querySelector('.settings-pop-button').getAttribute('aria-expanded') === 'true');
app.root().dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
check('escape closes panel', !app.root().querySelector('.mini-settings-panel').classList.contains('visible'));
check('aria-expanded reset', app.root().querySelector('.settings-pop-button').getAttribute('aria-expanded') === 'false');

app.click('.deadline-pop-button');
check('deadline panel opened', app.root().querySelector('.deadline-panel').classList.contains('visible'));
check('deadline panel clock alive', app.digits('.deadline-panel .deadline-clock').length === 9);

/* 5. outside click, then service worker commands */
app.window.document.dispatchEvent(new app.window.MouseEvent('pointerdown', { bubbles: true }));
await wait(80);
check('already minimized stays', app.root().classList.contains('minimized'));

app.deliver({ type: 'focus-exe/command:toggle' });
await wait(80);
check('command toggles the widget off', !app.host());

app.deliver({ type: 'focus-exe/command:show' });
await wait(80);
check('command mounts it again', Boolean(app.host()));
check('state survived the unmount', app.store.focusExeStateV1?.mode === 'break', app.store.focusExeStateV1?.mode);

app.deliver({ type: 'focus-exe/command:hide' }, { id: 'attacker-extension' });
await wait(80);
check('foreign sender ignored', Boolean(app.host()));

app.deliver({ type: 'totally/unknown' });
await wait(40);
check('unknown message ignored', Boolean(app.host()));

app.deliver({ type: 'focus-exe/command:hide' });
await wait(80);
check('hide tears the widget down', !app.host());
check('state flushed on teardown', app.store.focusExeStateV1?.mode === 'break');

/* 6. re-injection is a no-op, and expired sessions settle on mount */
app.window.eval(bundle);
await wait(100);
check('second injection does not remount', !app.host());
app.deliver({ type: 'focus-exe/command:show' });
await wait(100);
check('single widget after re-injection', app.host().shadowRoot.querySelectorAll('.assistant').length === 1, `assistants=${app.host().shadowRoot.querySelectorAll('.assistant').length}`);

/* expired before the page was opened: settle silently, no stale notification */
const late = boot({
  seed: { mode: 'focus', running: true, endAt: Date.now() - 5_000, remaining: null, sessions: 3, brownNoise: true, metronome: true, minimized: false }
});
late.window.eval(bundle);
await wait(100);
check('expired session settles on mount', late.root().classList.contains('break-mode'), late.text('.mode-label'));
check('session counted once', late.text('.session-count') === '4 focus sessions', late.text('.session-count'));
check('no stale notification on restore', late.sent.length === 0, JSON.stringify(late.sent));

/* expiring while the page is open: the tick loop settles and notifies */
const live = boot({
  seed: { mode: 'focus', running: true, endAt: Date.now() + 1_200, remaining: null, sessions: 0, brownNoise: true, metronome: true, minimized: false }
});
live.window.eval(bundle);
await wait(3_000);
check('live expiry flips to break', live.root().classList.contains('break-mode'), live.text('.mode-label'));
check('live expiry notifies once', live.sent.length === 1 && live.sent[0].type === 'focus-exe/complete' && live.sent[0].mode === 'focus', JSON.stringify(live.sent));

/* 7. hostile storage cannot break the widget */
const hostile = boot({
  seed: { mode: 'hacked', running: 'yes', endAt: 'nope', remaining: -99_999_999, sessions: 1e12, brownNoise: 'x', metronome: null, minimized: 'true' }
});
hostile.window.eval(bundle);
await wait(100);
check('hostile mode rejected', hostile.text('.mode-label') === 'Focus session', hostile.text('.mode-label'));
check('hostile numbers clamped', hostile.text('.session-count') === '9999 focus sessions', hostile.text('.session-count'));
check('hostile booleans defaulted', hostile.root().querySelectorAll('.switch input:checked').length === 4);
check('no crash on hostile state', hostile.errors.length === 0, hostile.errors.join(' | '));

/* 8. regression: a stored IDLE record must not be read as 0:00.
      sanitize() used Number.isFinite(Number(x)), and Number(null) is 0, so a
      stored remaining:null was coerced to 0. remainingMs() reads a non-null
      remaining as "paused", so the clock showed 0:00 and Start built a
      zero-length session that settled immediately, counting a phantom
      completion. A fresh install never hit this because sanitize(null) returns
      the defaults untouched. */
const idle = boot({
  seed: { mode: 'focus', running: false, endAt: null, remaining: null, sessions: 2, brownNoise: true, metronome: true, minimized: false }
});
idle.window.eval(bundle);
await wait(100);
check('idle record keeps the full duration', idle.digits('.focus-clock:not(.mini-clock)') === '2500', idle.digits('.focus-clock:not(.mini-clock)'));

idle.click('.start-button');
idle.click('.confirm-button');
await wait(320);
const startedFromIdle = idle.digits('.focus-clock:not(.mini-clock)');
check('start from idle runs the full session', Number(startedFromIdle) > 2400, startedFromIdle);
check('start from idle counts no phantom session', idle.text('.session-count') === '2 focus sessions', idle.text('.session-count'));
check('start from idle fires no completion message', idle.sent.length === 0, JSON.stringify(idle.sent));

/* regression: running:true with a null endAt must not settle as a phantom */
const phantom = boot({
  seed: { mode: 'focus', running: true, endAt: null, remaining: null, sessions: 5, brownNoise: true, metronome: true, minimized: false }
});
phantom.window.eval(bundle);
await wait(100);
check('running with no endAt does not settle', phantom.text('.session-count') === '5 focus sessions', phantom.text('.session-count'));
check('running with no endAt stays in focus', phantom.text('.mode-label') === 'Focus session', phantom.text('.mode-label'));

check('no page leakage', app.window.document.querySelectorAll('#app *').length === 0);
check('no page globals leaked', !('focusExeStateV1' in app.window) && !app.window.__FOCUS_EXE__);
check('no runtime errors', [app, late, live, hostile, idle, phantom].every(ctx => ctx.errors.length === 0), [app, late, live, hostile, idle, phantom].flatMap(c => c.errors).join(' | '));

const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);



