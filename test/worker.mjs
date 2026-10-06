import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Everything is resolved from this file, so the suite runs from any checkout.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const workerBundle = readFileSync(join(ROOT, 'dist/chrome/background.js'), 'utf8');

const results = [];
const check = (name, pass, extra = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? `  [${extra}]` : ''}`);
};

function bootWorker({ lastError = undefined } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  const { window } = dom;
  const calls = { injected: [], tabMessages: [], notifications: [], opened: [] };
  const handlers = { action: [], command: [], message: [] };

  window.chrome = {
    runtime: {
      id: 'worker',
      lastError,
      getURL: p => `chrome-extension://worker/${p}`,
      onMessage: { addListener: fn => handlers.message.push(fn) }
    },
    tabs: {
      query: (_q, cb) => cb([{ id: 7 }]),
      create: (props, cb) => {
        calls.opened.push(props);
        cb?.();
      },
      sendMessage: (tabId, message, cb) => {
        calls.tabMessages.push({ tabId, type: message.type });
        cb?.();
      }
    },
    scripting: {
      executeScript: async ({ target, files }) => {
        calls.injected.push({ tabId: target.tabId, files });
        return [];
      }
    },
    action: { onClicked: { addListener: fn => handlers.action.push(fn) } },
    commands: { onCommand: { addListener: fn => handlers.command.push(fn) } },
    notifications: {
      create: (id, options, cb) => {
        calls.notifications.push({ id, options });
        cb?.();
      }
    }
  };

  // tabs.sendMessage reports "no receiver" through runtime.lastError
  let listenersPresent = false;
  const originalSend = window.chrome.tabs.sendMessage;
  window.chrome.tabs.sendMessage = (tabId, message, cb) => {
    calls.tabMessages.push({ tabId, type: message.type });
    window.chrome.runtime.lastError = listenersPresent ? undefined : { message: 'no receiver' };
    cb?.();
  };
  void originalSend;

  window.eval(workerBundle);
  return { window, calls, handlers, hasListeners: () => listenersPresent, setListeners: v => { listenersPresent = v; } };
}

const worker = bootWorker();
check('action listener registered', worker.handlers.action.length === 1);
check('command listener registered', worker.handlers.command.length === 1);
check('message listener registered', worker.handlers.message.length === 1);

/* first summon: no listener yet, so the script is injected */
worker.handlers.action[0]({ id: 7 });
await new Promise(r => setTimeout(r, 30));
check('injected on first summon', worker.calls.injected.length === 1, JSON.stringify(worker.calls.injected));
check('inject targets the tab', worker.calls.injected[0]?.tabId === 7 && worker.calls.injected[0]?.files[0] === 'content.js');
check('no toggle before a listener exists', worker.calls.tabMessages.length === 1);

/* later summons toggle the already injected script */
worker.setListeners(true);
worker.handlers.action[0]({ id: 7 });
await new Promise(r => setTimeout(r, 30));
check('no second injection', worker.calls.injected.length === 1);
check('toggle sent instead', worker.calls.tabMessages.at(-1)?.type === 'focus-exe/command:toggle');

/* the keyboard shortcut uses the active tab */
worker.handlers.command[0]('focus-exe-toggle');
await new Promise(r => setTimeout(r, 30));
check('shortcut toggles active tab', worker.calls.tabMessages.at(-1)?.tabId === 7);
worker.handlers.command[0]('some-other-command');
await new Promise(r => setTimeout(r, 30));
check('unrelated shortcut ignored', worker.calls.tabMessages.length === 3, `messages=${worker.calls.tabMessages.length}`);

/* notifications: only from our own content script, only fixed copy */
const before = worker.calls.notifications.length;
worker.handlers.message[0]({ type: 'focus-exe/complete', mode: 'break' }, { id: 'worker' });
worker.handlers.message[0]({ type: 'focus-exe/complete', mode: '<img src=x onerror=alert(1)>' }, { id: 'worker' });
worker.handlers.message[0]({ type: 'focus-exe/complete' }, { id: 'worker' });
worker.handlers.message[0]({ type: 'focus-exe/complete', mode: 'focus' }, { id: 'evil-extension' });
worker.handlers.message[0](null, { id: 'worker' });
worker.handlers.message[0]({ type: 'other/type' }, { id: 'worker' });
const made = worker.calls.notifications.slice(before);
check('only trusted, known messages notify', made.length === 3, JSON.stringify(made.map(n => n.options.title)));
check('unknown mode falls back to focus', made[1]?.options.title === 'Focus session complete' && made[2]?.options.title === 'Focus session complete');
check('notification icon resolves', made[0]?.options.iconUrl.endsWith('icons/icon128.png'));
check('notification text is fixed copy', made.every(n => ['Focus session complete', 'Break complete'].includes(n.options.title) && n.options.message.length < 60));
check('notification ids are unique', new Set(worker.calls.notifications.map(n => n.id)).size === worker.calls.notifications.length);

/* both settings links now open the GitHub repository */
const expectedAbout = 'https://github.com/vallimuthuraja-git/focus-exe';
worker.handlers.message[0]({ type: 'focus-exe/command:about' }, { id: 'worker' });
await new Promise(r => setTimeout(r, 20));
check('about opens the source repository on GitHub', worker.calls.opened.length === 1 && worker.calls.opened[0].url === expectedAbout, JSON.stringify(worker.calls.opened));
worker.handlers.message[0]({ type: 'focus-exe/command:about' }, { id: 'someone-else' });
await new Promise(r => setTimeout(r, 20));
check('about ignores foreign senders', worker.calls.opened.length === 1);

worker.handlers.message[0]({ type: 'focus-exe/command:repo' }, { id: 'worker' });
await new Promise(r => setTimeout(r, 20));
const repo = worker.calls.opened.at(-1);
check('repo opens the source repository', repo?.url === 'https://github.com/vallimuthuraja-git/focus-exe', repo?.url);
worker.handlers.message[0]({ type: 'focus-exe/command:repo' }, { id: 'someone-else' });
await new Promise(r => setTimeout(r, 20));
check('repo ignores foreign senders', worker.calls.opened.length === 2, JSON.stringify(worker.calls.opened));

/* an unknown target must not open anything */
worker.handlers.message[0]({ type: 'focus-exe/command:anything-else' }, { id: 'worker' });
await new Promise(r => setTimeout(r, 20));
check('unknown open target opens no tab', worker.calls.opened.length === 2, JSON.stringify(worker.calls.opened));

const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
